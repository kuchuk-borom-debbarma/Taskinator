import { EventEmitter } from 'events';
import type { Bus, DomainEvent } from './types.ts';
import { createEvent } from './idempotency.ts';
import { KAFKA_TOPICS } from './constants.ts';

export class MemoryBus implements Bus {
    private emitter = new EventEmitter();

    async init() {}

    async destroy() {
        this.emitter.removeAllListeners();
    }

    async publish(
        topic: string,
        type: string,
        payload:
            | { id?: string; key: string; data: any }
            | Array<{ id?: string; key: string; data: any }>,
    ) {
        const items = Array.isArray(payload) ? payload : [payload];
        const events = items.map((i) => createEvent(type, i.key, i.data, i.id));
        // Emit with a small async delay to simulate Kafka's async delivery
        for (const e of events) {
            setTimeout(
                () => this.emitter.emit(`${topic}:${e.type}`, e.data),
                10,
            );
        }
    }

    async subscribe(
        topic: string,
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
        options?: { batch?: boolean },
    ) {
        for (const [eventType, handler] of Object.entries(handlers)) {
            this.emitter.on(`${topic}:${eventType}`, handler);
        }
    }
}
