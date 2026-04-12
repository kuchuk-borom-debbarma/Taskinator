import { Kafka, Partitioners, type Producer, type Consumer } from 'kafkajs';
import { EVENT_TO_TOPIC, KAFKA_TOPICS } from './constants.ts';
import type { Bus, DomainEvent } from './types.ts';
import { createEvent, withIdempotency } from './idempotency.ts';
import { context, propagation, trace } from '@opentelemetry/api';

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
        type: string,
        payload: { id?: string; key: string; data: any } | Array<{ id?: string; key: string; data: any }>,
    ) {
        const items = Array.isArray(payload) ? payload : [payload];
        const topic = EVENT_TO_TOPIC[type];
        if (!topic) throw new Error(`Unknown event type: ${type}`);
        const events = items.map((i) => createEvent(type, i.key, i.data, i.id));
        await this.emit(events, topic);
    }

    async subscribe(
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
    ) {
        // Group handlers by their Kafka topic, then spin up one consumer per topic.
        const byTopic: Record<string, Record<string, (data: any) => Promise<void>>> = {};
        for (const [eventType, handler] of Object.entries(handlers)) {
            const topic = EVENT_TO_TOPIC[eventType];
            if (!topic) continue;
            byTopic[topic] ??= {};
            byTopic[topic]![eventType] = handler;
        }
        await Promise.all(
            Object.entries(byTopic).map(([topic, topicHandlers]) =>
                this.createConsumer(topic, groupId, topicHandlers),
            ),
        );
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

                                // 2. Safe Execution using the Idempotency Wrapper
                                await withIdempotency(
                                    allEvents,
                                    groupId,
                                    async (unprocessed) => {
                                        // Pre-filter: drop any events if the consumer was
                                        // revoked mid-batch (rebalance / shutdown).
                                        const live = unprocessed.filter(
                                            () => isRunning() && !isStale(),
                                        );

                                        // Group events by type so that:
                                        //   - Events of DIFFERENT types run concurrently (Promise.all)
                                        //   - Events of the SAME type run in arrival order (serial)
                                        //     to preserve per-type consistency.
                                        const byType = new Map<
                                            string,
                                            DomainEvent[]
                                        >();
                                        for (const e of live) {
                                            const bucket = byType.get(e.type) ?? [];
                                            bucket.push(e);
                                            byType.set(e.type, bucket);
                                        }

                                        await Promise.all(
                                            Array.from(byType.entries()).map(
                                                async ([type, events]) => {
                                                    const handler = handlers[type];
                                                    if (!handler) return;
                                                    for (const e of events) {
                                                        await handler(e.data);
                                                    }
                                                },
                                            ),
                                        );
                                    },
                                );

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
}
