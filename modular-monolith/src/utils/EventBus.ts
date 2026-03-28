import { EventEmitter } from 'events';
import { kafka } from '../kafka';
import type { Producer, Consumer } from 'kafkajs';

interface Bus {
    publish(topic: string, message: any | any[]): Promise<void>;
    subscribe(topic: string, groupId: string, handler: (event: any) => Promise<void>): Promise<void>;
    subscribeBatch(topic: string, groupId: string, handler: (events: any[]) => Promise<void>): Promise<void>;
    init(): Promise<void>;
    destroy(): Promise<void>;
}

function parseKafkaMessage(messageValue: Buffer | null | undefined): any {
    const content = messageValue?.toString();
    if (!content) return null;
    
    try {
        const event = JSON.parse(content);
        if (event.value && typeof event.value === 'string') {
            try {
                const inner = JSON.parse(event.value);
                return { ...event, ...inner };
            } catch (e) {
                return event;
            }
        }
        return event;
    } catch (e) {
        return null;
    }
}

class MemoryBus implements Bus {
    private emitter = new EventEmitter();

    async init() {
        console.log('--- MemoryBus Initialized (Test Mode) ---');
    }
    
    async destroy() {
        this.emitter.removeAllListeners();
    }

    async publish(topic: string, message: any | any[]) {
        const messages = Array.isArray(message) ? message : [message];
        
        for (const msg of messages) {
            // In Kafka, messages are usually stringified
            const stringified = JSON.stringify(msg);
            setTimeout(() => {
                const event = parseKafkaMessage(Buffer.from(stringified));
                if (event) {
                    this.emitter.emit(topic, event);
                }
            }, 10);
        }
    }

    async subscribe(topic: string, _groupId: string, handler: (event: any) => Promise<void>) {
        this.emitter.on(topic, handler);
    }

    async subscribeBatch(topic: string, _groupId: string, handler: (events: any[]) => Promise<void>) {
        // MemoryBus simple implementation: wrap each event in an array
        this.emitter.on(topic, async (event) => {
            await handler([event]);
        });
    }
}

class KafkaBus implements Bus {
    private producer: Producer;
    private consumers: Map<string, Consumer> = new Map();

    constructor() {
        this.producer = kafka.producer({
            allowAutoTopicCreation: true,
            idempotent: true,
        });
    }

    async init() {
        await this.producer.connect();
    }

    async destroy() {
        await this.producer.disconnect();
        for (const consumer of this.consumers.values()) {
            await consumer.disconnect();
        }
    }

    async publish(topic: string, message: any | any[]) {
        const messages = Array.isArray(message) ? message : [message];
        
        await this.producer.send({
            topic,
            messages: messages.map(msg => ({ 
                key: msg.key, 
                value: JSON.stringify(msg),
                headers: msg.headers
            })),
        });
    }

    async subscribe(topic: string, groupId: string, handler: (event: any) => Promise<void>) {
        const consumer = kafka.consumer({ groupId });
        await consumer.connect();
        await consumer.subscribe({ topic, fromBeginning: false });
        await consumer.run({
            eachMessage: async ({ message }) => {
                const event = parseKafkaMessage(message.value);
                if (event) {
                    await handler(event);
                }
            },
        });
        this.consumers.set(groupId, consumer);
    }

    async subscribeBatch(topic: string, groupId: string, handler: (events: any[]) => Promise<void>) {
        const consumer = kafka.consumer({ groupId });
        await consumer.connect();
        await consumer.subscribe({ topic, fromBeginning: false });
        await consumer.run({
            eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
                const events: any[] = [];
                for (const message of batch.messages) {
                    if (!isRunning() || isStale()) break;
                    const event = parseKafkaMessage(message.value);
                    if (event) events.push(event);
                }

                if (events.length > 0) {
                    await handler(events);
                }

                for (const message of batch.messages) {
                    resolveOffset(message.offset);
                }
                await heartbeat();
            },
        });
        this.consumers.set(groupId, consumer);
    }
}

export const eventBus: Bus = process.env.NODE_ENV === 'test' ? new MemoryBus() : new KafkaBus();
