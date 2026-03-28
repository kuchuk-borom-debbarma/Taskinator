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
            const event = JSON.parse(stringified);
            if (event.value && typeof event.value === 'string') {
                try {
                    const inner = JSON.parse(event.value);
                    this.emitter.emit(topic, { ...event, ...inner });
                } catch (e) {
                    this.emitter.emit(topic, event);
                }
            } else {
                this.emitter.emit(topic, event);
            }
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
                    const event = JSON.parse(content);
                    // If the event has a 'value' string, it's likely from buildKafkaMessage
                    if (event.value && typeof event.value === 'string') {
                        try {
                            const inner = JSON.parse(event.value);
                            await handler({ ...event, ...inner });
                        } catch (e) {
                            await handler(event);
                        }
                    } else {
                        await handler(event);
                    }
                }
            },
        });
        this.consumers.set(groupId, consumer);
    }
}

export const eventBus: Bus = process.env.NODE_ENV === 'test' ? new MemoryBus() : new KafkaBus();
