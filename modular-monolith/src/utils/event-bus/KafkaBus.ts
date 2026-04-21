import { context, propagation, trace } from '@opentelemetry/api';
import { type Consumer, Kafka, Partitioners, type Producer } from 'kafkajs';
import type { Transaction } from 'kysely';
import type { Database } from '../../database';
import { KAFKA_TOPICS } from './constants.ts';
import { createEvent, withIdempotency } from './idempotency.ts';
import type { Bus, DomainEvent } from './types.ts';

export class KafkaBus implements Bus {
    private kafka = new Kafka({
        clientId: 'taskinator-v2',
        brokers: ['localhost:9092'],
    });
    private producer: Producer;
    private consumers: Consumer[] = [];

    constructor() {
        this.producer = this.kafka.producer({
            idempotent: true,
            createPartitioner: Partitioners.LegacyPartitioner,
        });
    }

    private isInitialized = false;

    async init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        await this.producer.connect();

        // Admin: Auto-create topics so that consumers don't crash on fresh environments
        const admin = this.kafka.admin();
        await admin.connect();
        const existingTopics = await admin.listTopics();
        const requiredTopics = Object.values(KAFKA_TOPICS);
        const topicsToCreate = requiredTopics.filter(
            (t) => !existingTopics.includes(t),
        );

        if (topicsToCreate.length > 0) {
            await admin.createTopics({
                waitForLeaders: true,
                topics: topicsToCreate.map((topic) => ({ topic })),
            });
        }
        await admin.disconnect();
    }

    async destroy() {
        await this.producer.disconnect();
        for (const c of this.consumers) await c.disconnect();
    }

    async publish(
        topic: string,
        type: string,
        payload:
            | { id?: string; key: string | null; data: any }
            | Array<{ id?: string; key: string | null; data: any }>,
    ) {
        const items = Array.isArray(payload) ? payload : [payload];
        const events = items.map((i) => createEvent(type, i.key, i.data, i.id));
        await this.emit(events, topic);
    }

    async subscribe(
        topic: string,
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
        options?: { batch?: boolean; manualIdempotency?: boolean },
    ) {
        await this.createConsumer(topic, groupId, handlers, options);
    }

    private async emit(events: DomainEvent[], topic: string) {
        await this.producer.send({
            topic,
            messages: events.map((e) => {
                const headers: Record<string, string> = {};
                propagation.inject(context.active(), headers);
                return { key: e.key, value: JSON.stringify(e), headers };
            }),
        });
    }

    private async createConsumer(
        topic: string,
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
        options?: { batch?: boolean; manualIdempotency?: boolean },
    ) {
        const consumer = this.kafka.consumer({ groupId });
        await consumer.connect();
        await consumer.subscribe({ topic, fromBeginning: false });

        await consumer.run({
            eachBatch: async ({
                batch,
                isRunning,
                isStale,
                heartbeat,
                resolveOffset,
            }) => {
                if (batch.messages.length === 0) return;

                // Extract trace context from the first message in the batch
                const firstMessageHeaders = batch.messages[0]?.headers || {};
                const parentContext = propagation.extract(
                    context.active(),
                    firstMessageHeaders as any,
                );

                // Run the entire batch processing within the stitched trace context
                await context.with(parentContext, async () => {
                    // Create an explicit span to represent the Consumer taking action
                    const tracer = trace.getTracer('kafkajs-consumer');
                    await tracer.startActiveSpan(
                        `process batch ${topic}`,
                        {},
                        async (span) => {
                            try {
                                // 1. Parsing & Filtering
                                const allEvents: DomainEvent[] = batch.messages
                                    .map((m) =>
                                        JSON.parse(m.value?.toString() || '{}'),
                                    )
                                    .filter((e) => handlers[e.type]);

                                // 2. Idempotency handling
                                if (options?.manualIdempotency) {
                                    // Bypassing global idempotency. The listener MUST call claimEventsAtomic.
                                    await this.executeHandlers(
                                        allEvents,
                                        handlers,
                                        options,
                                        isRunning,
                                        isStale,
                                    );
                                } else {
                                    // Standard Global Idempotency (Non-Transactional)
                                    await withIdempotency(
                                        allEvents,
                                        groupId,
                                        async (unprocessed, trx) => {
                                            await this.executeHandlers(
                                                unprocessed,
                                                handlers,
                                                options,
                                                isRunning,
                                                isStale,
                                                trx,
                                            );
                                        },
                                    );
                                }

                                // 3. Mark the Kafka batch as consumed to advance the offset
                                for (const m of batch.messages)
                                    resolveOffset(m.offset);
                                await heartbeat();
                            } finally {
                                span.end();
                            }
                        },
                    );
                });
            },
        });

        this.consumers.push(consumer);
    }

    private async executeHandlers(
        events: DomainEvent[],
        handlers: Record<
            string,
            (data: any, trx?: Transaction<Database>) => Promise<void>
        >,
        options: { batch?: boolean } | undefined,
        isRunning: () => boolean,
        isStale: () => boolean,
        trx?: Transaction<Database>,
    ) {
        // Pre-filter: drop any events if the consumer was
        // revoked mid-batch (rebalance / shutdown).
        const live = events.filter(() => isRunning() && !isStale());

        // Group events by type so that:
        //   - Events of DIFFERENT types run concurrently (Promise.all)
        //   - Events of the SAME type run in arrival order (serial)
        //     to preserve per-type consistency.
        const byType = new Map<string, DomainEvent[]>();
        for (const e of live) {
            const bucket = byType.get(e.type) ?? [];
            bucket.push(e);
            byType.set(e.type, bucket);
        }

        await Promise.all(
            Array.from(byType.entries()).map(async ([type, events]) => {
                const handler = handlers[type];
                if (!handler) return;

                if (options?.batch) {
                    // Pass the entire array of events to the batch handler
                    await handler(events, trx);
                } else {
                    // Maintain standard serial execution for non-batch handlers
                    for (const e of events) {
                        await handler(e.data, trx);
                    }
                }
            }),
        );
    }
}
