import { EventEmitter } from 'events';
import { kafka } from '../kafka';
import type { Producer, Consumer } from 'kafkajs';

interface Bus {
    publish(topic: string, message: any): Promise<void>;
    subscribe(topic: string, groupId: string, handler: (event: any) => Promise<void>): Promise<void>;
    init(): Promise<void>;
    destroy(): Promise<void>;
}

class MemoryBus implements Bus {
    private emitter = new EventEmitter();

    async init() {
        console.log('--- MemoryBus Initialized (Test Mode) ---');
    }
    
    async destroy() {
        this.emitter.removeAllListeners();
    }

    async publish(topic: string, message: any) {
        // In Kafka, messages are usually stringified
        const stringified = JSON.stringify(message);
        setTimeout(() => {
            this.emitter.emit(topic, JSON.parse(stringified));
        }, 10);
    }

    async subscribe(topic: string, _groupId: string, handler: (event: any) => Promise<void>) {
        this.emitter.on(topic, handler);
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

    async publish(topic: string, message: any) {
        await this.producer.send({
            topic,
            messages: [{ 
                key: message.key, 
                value: JSON.stringify(message),
                headers: message.headers
            }],
        });
    }

    async subscribe(topic: string, groupId: string, handler: (event: any) => Promise<void>) {
        const consumer = kafka.consumer({ groupId });
        await consumer.connect();
        await consumer.subscribe({ topic, fromBeginning: false });
        await consumer.run({
            eachMessage: async ({ message }) => {
                const content = message.value?.toString();
                if (content) {
                    await handler(JSON.parse(content));
                }
            },
        });
        this.consumers.set(groupId, consumer);
    }
}

export const eventBus: Bus = process.env.NODE_ENV === 'test' ? new MemoryBus() : new KafkaBus();
