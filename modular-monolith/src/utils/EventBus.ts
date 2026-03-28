import { EventEmitter } from 'events';
import { kafka } from '../kafka';
import type { Producer, Consumer } from 'kafkajs';
import type { DomainEvent } from './kafka';
import { withBatchIdempotency } from './idempotency';

/**
 * A thin, type-safe wrapper around Kafka.
 * Handles batching and idempotency automatically.
 */
interface Bus {
    emit(topic: string, event: DomainEvent | DomainEvent[]): Promise<void>;
    on(topic: string, groupId: string, handlers: Record<string, (data: any) => Promise<void>>): Promise<void>;
    init(): Promise<void>;
    destroy(): Promise<void>;
}

class MemoryBus implements Bus {
    private emitter = new EventEmitter();

    async init() {}
    async destroy() { this.emitter.removeAllListeners(); }

    async emit(topic: string, event: DomainEvent | DomainEvent[]) {
        const events = Array.isArray(event) ? event : [event];
        for (const e of events) {
            // Simulate async Kafka behavior
            setTimeout(() => this.emitter.emit(`${topic}:${e.type}`, e.data), 10);
        }
    }

    async on(topic: string, _groupId: string, handlers: Record<string, (data: any) => Promise<void>>) {
        for (const [type, handler] of Object.entries(handlers)) {
            this.emitter.on(`${topic}:${type}`, handler);
        }
    }
}

class KafkaBus implements Bus {
    private producer: Producer;
    private consumers: Map<string, Consumer> = new Map();

    constructor() {
        this.producer = kafka.producer({ allowAutoTopicCreation: true, idempotent: true });
    }

    async init() { await this.producer.connect(); }

    async destroy() {
        await this.producer.disconnect();
        for (const c of this.consumers.values()) await c.disconnect();
    }

    async emit(topic: string, event: DomainEvent | DomainEvent[]) {
        const events = Array.isArray(event) ? event : [event];
        await this.producer.send({
            topic,
            messages: events.map(e => ({ key: e.key, value: JSON.stringify(e) })),
        });
    }

    async on(topic: string, groupId: string, handlers: Record<string, (data: any) => Promise<void>>) {
        const consumer = kafka.consumer({ groupId });
        await consumer.connect();
        await consumer.subscribe({ topic, fromBeginning: false });
        
        await consumer.run({
            eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
                const allEvents: DomainEvent[] = batch.messages
                    .map(m => JSON.parse(m.value?.toString() || '{}'))
                    .filter(e => handlers[e.type]);

                if (allEvents.length > 0) {
                    await withBatchIdempotency(allEvents, groupId, async (unprocessed) => {
                        for (const e of unprocessed) {
                            if (!isRunning() || isStale()) break;
                            await handlers[e.type](e.data);
                        }
                    });
                }

                for (const m of batch.messages) resolveOffset(m.offset);
                await heartbeat();
            },
        });
        this.consumers.set(groupId, consumer);
    }
}

export const eventBus: Bus = process.env.NODE_ENV === 'test' ? new MemoryBus() : new KafkaBus();
