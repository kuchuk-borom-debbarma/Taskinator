import { context, propagation, trace } from '@opentelemetry/api';
import { type Consumer, Kafka, Partitioners, type Producer } from 'kafkajs';
import { logger } from '../../logger';
import { KAFKA_TOPICS } from './constants.ts';
import { createEvent } from './idempotency.ts';
import type { Bus, DomainEvent } from './types.ts';

export class KafkaBus implements Bus {
    private kafka = new Kafka({
        clientId: 'taskinator-v2',
        brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
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

        logger.info('Kafka: Connecting producer...');
        await this.producer.connect();
        logger.info('Kafka: Producer connected');

        const admin = this.kafka.admin();
        await admin.connect();
        const existingTopics = await admin.listTopics();
        const requiredTopics = Object.values(KAFKA_TOPICS) as string[];
        const topicsToCreate = requiredTopics.filter(
            (t) => !existingTopics.includes(t),
        );

        if (topicsToCreate.length > 0) {
            logger.info(`Kafka: Creating topics: ${topicsToCreate.join(', ')}`);
            await admin.createTopics({
                waitForLeaders: true,
                topics: topicsToCreate.map((topic) => ({ topic })),
            });
        }
        await admin.disconnect();
    }

    async destroy() {
        logger.info('Kafka: Disconnecting producer and consumers...');
        await this.producer.disconnect();
        for (const c of this.consumers) await c.disconnect();
        logger.info('Kafka: Disconnected');
    }

    async publish(
        topic: string,
        type: string,
        payload:
            | { id?: string; key: string | null; data: any }
            | Array<{ id?: string; key: string | null; data: any }>,
    ) {
        const items = Array.isArray(payload) ? payload : [payload];
        logger.debug(
            `Kafka: Publishing ${items.length} events to topic "${topic}" (Type: ${type})`,
        );
        const events = items.map((i) => createEvent(type, i.key, i.data, i.id));
        await this.emit(events, topic);
    }

    async subscribe(
        topic: string,
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
        options?: { batch?: boolean },
    ) {
        logger.info(`Kafka: Subscribing to "${topic}" (Group: ${groupId})`);
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
        options?: { batch?: boolean },
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

                logger.debug(
                    `Kafka Consumer [${groupId}]: Received batch of ${batch.messages.length} from "${topic}"`,
                );

                const firstMessageHeaders = batch.messages[0]?.headers || {};
                const parentContext = propagation.extract(
                    context.active(),
                    firstMessageHeaders as any,
                );

                await context.with(parentContext, async () => {
                    const tracer = trace.getTracer('kafkajs-consumer');
                    await tracer.startActiveSpan(
                        `process batch ${topic}`,
                        {},
                        async (span) => {
                            try {
                                const allEvents: DomainEvent[] = batch.messages
                                    .map((m) =>
                                        JSON.parse(m.value?.toString() || '{}'),
                                    )
                                    .filter((e) => handlers[e.type]);

                                if (allEvents.length > 0) {
                                    logger.info(
                                        `Kafka Consumer [${groupId}]: Processing ${allEvents.length} relevant events from "${topic}"`,
                                    );
                                    await this.executeHandlers(
                                        allEvents,
                                        handlers,
                                        options,
                                        isRunning,
                                        isStale,
                                    );
                                }

                                for (const m of batch.messages)
                                    resolveOffset(m.offset);
                                await heartbeat();
                            } catch (err) {
                                logger.error(
                                    `Kafka Consumer [${groupId}]: Batch processing failed`,
                                    err,
                                );
                                throw err;
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
        handlers: Record<string, (data: any) => Promise<void>>,
        options: { batch?: boolean } | undefined,
        isRunning: () => boolean,
        isStale: () => boolean,
    ) {
        const live = events.filter(() => isRunning() && !isStale());

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

                logger.debug(
                    `Kafka: Executing handler for type "${type}" (${events.length} events)`,
                );
                if (options?.batch) {
                    await handler(events);
                } else {
                    for (const e of events) {
                        await handler(e.data);
                    }
                }
            }),
        );
    }
}
