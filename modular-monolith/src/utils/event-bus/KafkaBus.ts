import { Kafka, Partitioners, type Producer, type Consumer } from 'kafkajs';
import { EVENT_TO_TOPIC, KAFKA_TOPICS } from './constants.ts';
import type { Bus, DomainEvent } from './types.ts';
import { createEvent, withIdempotency } from './idempotency.ts';

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

    async init() {
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
        payload: { key: string; data: any } | Array<{ key: string; data: any }>,
    ) {
        const items = Array.isArray(payload) ? payload : [payload];
        const topic = EVENT_TO_TOPIC[type];
        if (!topic) throw new Error(`Unknown event type: ${type}`);
        const events = items.map((i) => createEvent(type, i.key, i.data));
        await this.emit(topic, events);
    }

    async subscribe(
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
    ) {
        const topicsToHandlers: Record<
            string,
            Record<string, (data: any) => Promise<void>>
        > = {};
        for (const [type, handler] of Object.entries(handlers)) {
            const topic = EVENT_TO_TOPIC[type];
            if (!topic) continue;
            topicsToHandlers[topic] = topicsToHandlers[topic] || {};
            topicsToHandlers[topic][type] = handler;
        }
        for (const [topic, topicHandlers] of Object.entries(topicsToHandlers)) {
            await this.on(topic, groupId, topicHandlers);
        }
    }

    async emit(topic: string, event: DomainEvent | DomainEvent[]) {
        const events = Array.isArray(event) ? event : [event];
        await this.producer.send({
            topic,
            messages: events.map((e) => ({
                key: e.key,
                value: JSON.stringify(e),
            })),
        });
    }

    async on(
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
                // 1. Parsing & Filtering
                const allEvents: DomainEvent[] = batch.messages
                    .map((m) => JSON.parse(m.value?.toString() || '{}'))
                    .filter((e) => handlers[e.type]);

                // 2. Safe Execution using the Idempotency Wrapper
                await withIdempotency(
                    allEvents,
                    groupId,
                    async (unprocessed) => {
                        for (const e of unprocessed) {
                            if (!isRunning() || isStale()) break;
                            const handler = handlers[e.type];
                            if (handler) await handler(e.data);
                        }
                    },
                );

                // 3. Mark the Kafka batch as consumed to advance the offset
                for (const m of batch.messages) resolveOffset(m.offset);
                await heartbeat();
            },
        });

        this.consumers.push(consumer);
    }
}
