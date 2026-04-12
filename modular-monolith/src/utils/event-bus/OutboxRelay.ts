import { db } from '../../database';
import eventBus from '../EventBus.ts';

let isRunning = false;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

const fetchPendingEvents = async () => {
    return await db
        .selectFrom('outbox_events')
        .selectAll()
        .where('status', '=', 'PENDING')
        .orderBy('created_at', 'asc')
        .limit(100)
        .execute();
};

const dispatchToEventBus = async (
    events: { id: string; kafka_topic: string; kafka_key: string; payload: any }[],
) => {
    // Group events by topic to optimize kafka publishing
    const byTopic: Record<string, Array<{ id: string; key: string; data: any }>> = {};

    for (const event of events) {
        byTopic[event.kafka_topic] ??= [];
        byTopic[event.kafka_topic]!.push({
            id: event.id,
            key: event.kafka_key,
            data: event.payload,
        });
    }

    // Publish each topic batch directly
    const publishPromises = Object.entries(byTopic).map(
        ([eventType, payloads]) => eventBus.publish(eventType, payloads),
    );

    await Promise.all(publishPromises);
};

const clearProcessedEvents = async (eventIds: string[]) => {
    await db
        .deleteFrom('outbox_events')
        .where('id', 'in', eventIds)
        .execute();
};

const processOutboxBatch = async () => {
    const events = await fetchPendingEvents();
    if (events.length === 0) return;

    await dispatchToEventBus(events);

    // Delete processed outbox events to keep database lean
    const eventIds = events.map((e) => e.id);
    await clearProcessedEvents(eventIds);
};

const poll = async () => {
    if (!isRunning) return;

    try {
        await processOutboxBatch();
    } catch (err) {
        console.error('[Outbox Relay] Error processing events:', err);
    } finally {
        if (isRunning) {
            timeoutId = setTimeout(poll, 200);
        }
    }
};

export const startOutboxRelay = () => {
    if (isRunning) return;
    isRunning = true;

    console.log('[Outbox Relay] Started polling for wCTE outbox events');
    poll();
};

export const stopOutboxRelay = () => {
    isRunning = false;
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
    console.log('[Outbox Relay] Stopped.');
};
