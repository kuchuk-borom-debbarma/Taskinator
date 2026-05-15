import { EventEmitter } from 'node:events';
import { createEvent } from './idempotency.ts';
import type { Bus } from './types.ts';

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
            | { id?: string; key: string | null; data: any }
            | Array<{ id?: string; key: string | null; data: any }>,
    ) {
        const items = Array.isArray(payload) ? payload : [payload];
        const events = items.map((i) => createEvent(type, i.key, i.data, i.id));
        // Emit with a small async delay to simulate Kafka's async delivery
        for (const e of events) {
            setTimeout(() => {
                this.emitter.emit(`${topic}:${e.type}`, e);
                this.emitter.emit(`${topic}:*`, e); // Support wildcard listeners
            }, 10);
        }
    }

    async subscribe(
        topic: string,
        _groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
        options?: { batch?: boolean },
    ) {
        for (const [eventType, handler] of Object.entries(handlers)) {
            let processingQueue: Promise<void> = Promise.resolve();
            this.emitter.on(`${topic}:${eventType}`, (e) => {
                processingQueue = processingQueue.then(async () => {
                    try {
                        if (options?.batch) {
                            await handler([e]);
                        } else {
                            // If it's a wildcard handler, we might want to pass the type too
                            // but the interface says (data: any)
                            await handler(e.data);
                        }
                    } catch (err) {
                        console.error(
                            `MemoryBus: Handler error for ${eventType}`,
                            err,
                        );
                    }
                });
            });
        }
    }
}
