import { type Consumer, Kafka, Partitioners, type Producer } from 'kafkajs';
import { logger } from '../../logger';
import { EVENT_STREAMS } from './constants.ts';
import { createEvent } from './eventFactory.ts';
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
        const requiredTopics = Object.values(EVENT_STREAMS) as string[];
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
        stream: string,
        type: string,
        payload:
            | { id?: string; key: string | null; data: any }
            | Array<{ id?: string; key: string | null; data: any }>,
    ) {
        const items = Array.isArray(payload) ? payload : [payload];
        logger.debug(
            `Kafka: Publishing ${items.length} events to stream "${stream}" (Type: ${type})`,
        );
        // Carry traceContext from the outbox payload envelope into the DomainEvent
        const events = items.map((i) =>
            createEvent(type, i.key, i.data, i.id, i.data?.traceContext),
        );
        await this.emit(events, stream);
    }

    async subscribe(
        stream: string,
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
        options?: { batch?: boolean },
    ) {
        logger.info(`Kafka: Subscribing to "${stream}" (Group: ${groupId})`);
        await this.createConsumer(stream, groupId, handlers, options);
    }

    private async emit(events: DomainEvent[], stream: string) {
        await this.producer.send({
            topic: stream,
            messages: events.map((e) => ({
                key: e.key,
                value: JSON.stringify(e),
            })),
        });
    }

    private async createConsumer(
        stream: string,
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
        options?: { batch?: boolean },
    ) {
        const consumer = this.kafka.consumer({ groupId });
        await consumer.connect();
        await consumer.subscribe({ topic: stream, fromBeginning: false });

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
                    `Kafka Consumer [${groupId}]: Received batch of ${batch.messages.length} from "${stream}"`,
                );

                try {
                    const allEvents: DomainEvent[] = batch.messages
                        .map((m) => JSON.parse(m.value?.toString() || '{}'))
                        .filter((e) => handlers[e.type] || handlers['*']);

                    if (allEvents.length > 0) {
                        logger.info(
                            `Kafka Consumer [${groupId}]: Processing ${allEvents.length} relevant events from "${stream}"`,
                        );
                        await this.executeHandlers(
                            allEvents,
                            handlers,
                            options,
                            isRunning,
                            isStale,
                        );
                    }

                    for (const m of batch.messages) resolveOffset(m.offset);
                    await heartbeat();
                } catch (err) {
                    logger.error(
                        `Kafka Consumer [${groupId}]: Batch processing failed`,
                        err,
                    );
                    throw err;
                }
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

            if (handlers['*']) {
                const wildcardBucket = byType.get('*') ?? [];
                wildcardBucket.push(e);
                byType.set('*', wildcardBucket);
            }
        }

        await Promise.all(
            Array.from(byType.entries()).map(async ([type, typeEvents]) => {
                const handler = handlers[type];
                if (!handler) return;

                logger.debug(
                    `Kafka: Executing handler for type "${type}" (${typeEvents.length} events)`,
                );
                if (options?.batch) {
                    // Pass the full DomainEvent[] — traceContext travels in the envelope
                    await handler(typeEvents);
                } else {
                    for (const e of typeEvents) {
                        await handler(e.data);
                    }
                }
            }),
        );
    }
}
