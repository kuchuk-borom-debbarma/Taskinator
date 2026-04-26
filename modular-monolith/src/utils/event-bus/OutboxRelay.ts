import type { Transaction } from 'kysely';
import type { PoolClient } from 'pg';
import { type Database, db, pool } from '../../database';
import { logger } from '../../logger';
import eventBus from '../EventBus.ts';

let isRunning = false;
let timeoutId: ReturnType<typeof setTimeout> | null = null;
let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
let listenClient: PoolClient | null = null;

const fetchPendingEvents = async (trx: Transaction<Database>) => {
    // We use FOR UPDATE SKIP LOCKED to ensure multiple relay instances
    // don't process the same events.
    return await trx
        .selectFrom('outbox_events')
        .selectAll()
        .where('status', '=', 'PENDING')
        .orderBy('created_at', 'asc')
        .limit(100)
        .forUpdate()
        .skipLocked()
        .execute();
};

const dispatchToEventBus = async (
    events: {
        id: string;
        kafka_topic: string;
        kafka_key: string | null;
        payload: any;
    }[],
) => {
    // Group events by [Topic + Type] to perform bulk-publishes for specific event streams
    const groups = new Map<
        string,
        {
            topic: string;
            type: string;
            payloads: Array<{ id: string; key: string | null; data: any }>;
        }
    >();

    for (const event of events) {
        const topic = event.kafka_topic;
        const type = event.payload.type;
        const groupKey = `${topic}|${type}`;

        if (!groups.has(groupKey)) {
            groups.set(groupKey, { topic, type, payloads: [] });
        }

        groups.get(groupKey)?.payloads.push({
            id: event.event_id, // Use the UUID event_id for the event bus, NOT the database serial ID
            key: event.kafka_key,
            data: event.payload,
        });
    }

    const publishPromises = Array.from(groups.values()).map((group) => {
        logger.debug(
            `Relaying ${group.payloads.length} events of type "${group.type}" to topic "${group.topic}"`,
        );
        return eventBus.publish(group.topic, group.type, group.payloads);
    });

    await Promise.all(publishPromises);
};

const clearProcessedEvents = async (
    trx: Transaction<Database>,
    eventIds: string[],
) => {
    await trx.deleteFrom('outbox_events').where('id', 'in', eventIds).execute();
};

export const processOutboxBatch = async () => {
    // Wrap the entire process in a transaction to hold the 'FOR UPDATE' locks
    await db.transaction().execute(async (trx) => {
        const events = await fetchPendingEvents(trx);
        if (events.length === 0) return;

        logger.info(
            `Outbox Relay: Processing batch of ${events.length} events`,
        );

        // 1. Push to Kafka (At-Least-Once)
        await dispatchToEventBus(events);

        // 2. Clear from DB
        const eventIds = events.map((e) => e.id);
        await clearProcessedEvents(trx, eventIds);

        // If we fetched a full batch, check for more immediately after this transaction commits
        if (events.length === 100) {
            setImmediate(processOutboxBatch);
        }
    });
};

const setupListener = async () => {
    if (!isRunning) return;

    try {
        if (listenClient) {
            listenClient.release();
            listenClient = null;
        }

        listenClient = await pool.connect();
        logger.info('Outbox Relay: DB connection established for LISTEN');

        // Listen for new events
        await listenClient.query('LISTEN outbox_event_notification');

        listenClient.on('notification', (msg) => {
            if (msg.channel === 'outbox_event_notification' && isRunning) {
                processOutboxBatch().catch((err) =>
                    logger.error(
                        'Outbox Relay: Notification processing error:',
                        err,
                    ),
                );
            }
        });

        listenClient.on('error', (err) => {
            if (!isRunning) return;
            logger.error('Outbox Relay: Listen client error:', err);
            reconnectListener();
        });

        logger.info('Outbox Relay: Reactive LISTEN established.');
    } catch (err) {
        if (!isRunning) return;
        logger.error('Outbox Relay: Failed to setup LISTEN:', err);
        reconnectListener();
    }
};

const reconnectListener = () => {
    if (listenClient) {
        listenClient.release();
        listenClient = null;
    }
    if (isRunning && !reconnectTimeoutId) {
        logger.warn('Outbox Relay: Attempting to reconnect LISTEN in 5s...');
        reconnectTimeoutId = setTimeout(async () => {
            reconnectTimeoutId = null;
            await setupListener();
        }, 5000);
    }
};

const poll = async () => {
    if (!isRunning) return;

    try {
        await processOutboxBatch();
    } catch (err) {
        logger.error('Outbox Relay: Error processing events during poll:', err);
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

    logger.info(
        'Outbox Relay: Starting Reactive Relay (LISTEN + Safety Polling)',
    );
    processOutboxBatch().then(() => {
        setupListener();
        poll();
    });
};

export const stopOutboxRelay = () => {
    isRunning = false;
    logger.info('Outbox Relay: Stopping relay...');

    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }

    if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
    }

    if (listenClient) {
        // Use a background query to unlisten, don't wait for it
        listenClient.query('UNLISTEN outbox_event_notification').finally(() => {
            if (listenClient) {
                listenClient.release();
                listenClient = null;
            }
        });
    }
};
