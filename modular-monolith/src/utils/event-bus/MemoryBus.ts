import { EventEmitter } from 'events';
import { EVENT_TO_TOPIC } from './constants.ts';
import type { Bus, DomainEvent } from './types.ts';
import { createEvent } from './idempotency.ts';

export class MemoryBus implements Bus {
    private emitter = new EventEmitter();

    async init() {}

    async destroy() {
        this.emitter.removeAllListeners();
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
        for (const e of events) {
            setTimeout(
                () => this.emitter.emit(`${topic}:${e.type}`, e.data),
                10,
            );
        }
    }

    async on(
        topic: string,
        _groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
    ) {
        for (const [type, handler] of Object.entries(handlers)) {
            this.emitter.on(`${topic}:${type}`, handler);
        }
    }
}
