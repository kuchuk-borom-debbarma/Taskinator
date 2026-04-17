import { db, pool } from '../../database';
import eventBus from '../EventBus.ts';
import type { PoolClient } from 'pg';

let isRunning = false;
let timeoutId: ReturnType<typeof setTimeout> | null = null;
let listenClient: PoolClient | null = null;

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
    events: {
        id: string;
        kafka_topic: string;
        kafka_key: string;
        payload: any;
    }[],
) => {
    const byTopic: Record<
        string,
        Array<{ id: string; key: string; data: any }>
    > = {};

    for (const event of events) {
        byTopic[event.kafka_topic] ??= [];
        byTopic[event.kafka_topic]!.push({
            id: event.id,
            key: event.kafka_key,
            data: event.payload,
        });
    }

    const publishPromises = Object.entries(byTopic).map(
        ([eventType, payloads]) => eventBus.publish(eventType, payloads),
    );

    await Promise.all(publishPromises);
};

const clearProcessedEvents = async (eventIds: string[]) => {
    await db.deleteFrom('outbox_events').where('id', 'in', eventIds).execute();
};

const processOutboxBatch = async () => {
    const events = await fetchPendingEvents();
    if (events.length === 0) return;

    await dispatchToEventBus(events);
    const eventIds = events.map((e) => e.id);
    await clearProcessedEvents(eventIds);

    // If we fetched a full batch, check for more immediately
    if (events.length === 100) {
        setImmediate(processOutboxBatch);
    }
};

const setupListener = async () => {
    if (!isRunning) return;

    try {
        listenClient = await pool.connect();
        
        // Listen for new events
        await listenClient.query('LISTEN outbox_event_notification');
        
        listenClient.on('notification', (msg) => {
            if (msg.channel === 'outbox_event_notification' && isRunning) {
                processOutboxBatch().catch(err => 
                    console.error('[Outbox Relay] Notification processing error:', err)
                );
            }
        });

        listenClient.on('error', (err) => {
            console.error('[Outbox Relay] Listen client error:', err);
            reconnectListener();
        });

        console.log('[Outbox Relay] Reactive LISTEN established.');
    } catch (err) {
        console.error('[Outbox Relay] Failed to setup LISTEN:', err);
        reconnectListener();
    }
};

const reconnectListener = () => {
    if (listenClient) {
        listenClient.release();
        listenClient = null;
    }
    if (isRunning) {
        setTimeout(setupListener, 5000);
    }
};

const poll = async () => {
    if (!isRunning) return;

    try {
        await processOutboxBatch();
    } catch (err) {
        console.error('[Outbox Relay] Error processing events during poll:', err);
    } finally {
        if (isRunning) {
            // Safety poll every 10 seconds in case NOTIFY was missed or during reconnects
            timeoutId = setTimeout(poll, 10000);
        }
    }
};

export const startOutboxRelay = () => {
    if (isRunning) return;
    isRunning = true;

    console.log('[Outbox Relay] Starting Reactive Relay (LISTEN + Safety Polling)');
    processOutboxBatch().then(() => {
        setupListener();
        poll();
    });
};

export const stopOutboxRelay = () => {
    isRunning = false;
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
    if (listenClient) {
        listenClient.release();
        listenClient = null;
    }
    console.log('[Outbox Relay] Stopped.');
};
