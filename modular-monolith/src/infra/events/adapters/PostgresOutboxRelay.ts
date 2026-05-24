import { type Kysely, sql, type Transaction } from 'kysely';
import type { Pool, PoolClient } from 'pg';
import type { EventRelayPort } from '../../contracts/index.ts';
import type { Database } from '../../database/index.ts';
import type { Logger } from '../../logger/index.ts';
import type { Bus } from '../../utils/event-bus/types.ts';

interface PendingOutboxEvent {
    id: number;
    event_id: string;
    stream: string;
    stream_key: string | null;
    payload: any;
}

export class PostgresOutboxRelay implements EventRelayPort {
    readonly name = 'postgres-outbox-relay';

    private isRunning = false;
    private timeoutId: ReturnType<typeof setTimeout> | null = null;
    private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private listenClient: PoolClient | null = null;

    constructor(
        private readonly deps: {
            db: Kysely<Database>;
            pool: Pool;
            eventBus: Bus;
            logger: Logger;
        },
    ) {}

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        this.deps.logger.info(
            'Outbox Relay: Starting Reactive Relay (LISTEN + Safety Polling)',
        );
        this.processBatch().then(() => {
            this.setupListener();
            this.poll();
        });
    }

    stop() {
        this.isRunning = false;
        this.deps.logger.info('Outbox Relay: Stopping relay...');

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }

        if (this.listenClient) {
            this.listenClient
                .query('UNLISTEN outbox_event_notification')
                .finally(() => {
                    if (this.listenClient) {
                        this.listenClient.release();
                        this.listenClient = null;
                    }
                });
        }
    }

    async processBatch() {
        // 1. Claim pending events in a super-fast micro-transaction
        const events = await this.deps.db
            .transaction()
            .execute(async (trx: any) => {
                const pending = await this.fetchPendingEvents(trx);
                if (pending.length === 0) return [];

                const eventIds = pending.map((event) => event.id);

                // Lock events using a lease lock. If we crash, another process can reclaim it after 60s.
                await trx
                    .updateTable('outbox_events')
                    .set({
                        status: 'PROCESSING',
                        locked_at: sql<any>`NOW()`,
                    })
                    .where('id', 'in', eventIds)
                    .execute();

                return pending;
            });

        if (events.length === 0) return;

        this.deps.logger.info(
            `[OutboxRelay] Claimed batch of ${events.length} events for processing: ` +
                `[${events.map((event) => `id=${event.id}, stream=${event.stream}, type=${event.payload.type}`).join('; ')}]`,
        );

        try {
            // 2. Dispatch to Event Bus (Kafka network I/O) OUTSIDE the database transaction
            await this.dispatchToEventBus(events);

            // 3. Clear processed events in a fast, single query outside a transaction
            const eventIds = events.map((event) => event.id);
            await this.clearProcessedEvents(eventIds);

            if (events.length === 100 && this.isRunning) {
                setImmediate(() => this.processBatch());
            }
        } catch (err) {
            this.deps.logger.error(
                '[OutboxRelay] Error dispatching event batch, reverting status to PENDING for retry',
                err,
            );

            // Recovery: Reset events to PENDING so they can be claimed again immediately
            const eventIds = events.map((event) => event.id);
            try {
                await this.deps.db
                    .updateTable('outbox_events')
                    .set({
                        status: 'PENDING',
                        locked_at: null,
                    })
                    .where('id', 'in', eventIds)
                    .execute();
            } catch (resetErr) {
                this.deps.logger.error(
                    '[OutboxRelay] Failed to revert event batch status to PENDING',
                    resetErr,
                );
            }
        }
    }

    private async fetchPendingEvents(trx: Transaction<Database>) {
        // Query returns PENDING events OR events locked in PROCESSING for longer than 60s (indicating a crash)
        return await trx
            .selectFrom('outbox_events')
            .selectAll()
            .where((eb) =>
                eb.or([
                    eb('status', '=', 'PENDING'),
                    eb.and([
                        eb('status', '=', 'PROCESSING'),
                        eb(
                            'locked_at',
                            '<',
                            sql<any>`NOW() - INTERVAL '60 seconds'`,
                        ),
                    ]),
                ]),
            )
            .orderBy('created_at', 'asc')
            .limit(100)
            .forUpdate()
            .skipLocked()
            .execute();
    }

    private async clearProcessedEvents(eventIds: number[]) {
        await this.deps.db
            .deleteFrom('outbox_events')
            .where('id', 'in', eventIds)
            .execute();
    }

    private async dispatchToEventBus(events: PendingOutboxEvent[]) {
        const groups = new Map<
            string,
            {
                stream: string;
                type: string;
                payloads: Array<{ id: string; key: string | null; data: any }>;
            }
        >();

        for (const event of events) {
            const stream = event.stream;
            const type = event.payload.type;
            const groupKey = `${stream}|${type}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, { stream, type, payloads: [] });
            }

            groups.get(groupKey)?.payloads.push({
                id: event.event_id,
                key: event.stream_key,
                data: event.payload,
            });
        }

        await Promise.all(
            Array.from(groups.values()).map((group) => {
                this.deps.logger.info(
                    `[OutboxRelay] Relaying ${group.payloads.length} events of type "${group.type}" to stream "${group.stream}"` +
                        ` (eventIds: [${group.payloads.map((payload) => payload.id).join(', ')}])`,
                );
                return this.deps.eventBus.publish(
                    group.stream,
                    group.type,
                    group.payloads,
                );
            }),
        );
    }

    private async setupListener() {
        if (!this.isRunning) return;

        try {
            if (this.listenClient) {
                this.listenClient.release();
                this.listenClient = null;
            }

            this.listenClient = await this.deps.pool.connect();
            this.listenClient.setMaxListeners(50);

            this.deps.logger.info(
                'Outbox Relay: DB connection established for LISTEN',
            );

            await this.listenClient.query('LISTEN outbox_event_notification');

            this.listenClient.on('notification', (msg) => {
                this.deps.logger.debug(
                    `Outbox Relay: Received notification on channel ${msg.channel}`,
                );
                if (
                    msg.channel === 'outbox_event_notification' &&
                    this.isRunning
                ) {
                    this.processBatch().catch((err) =>
                        this.deps.logger.error(
                            'Outbox Relay: Notification processing error:',
                            err,
                        ),
                    );
                }
            });

            this.listenClient.on('error', (err) => {
                if (!this.isRunning) return;
                this.deps.logger.error(
                    'Outbox Relay: Listen client error:',
                    err,
                );
                this.reconnectListener();
            });

            this.deps.logger.info('Outbox Relay: Reactive LISTEN established.');
        } catch (err) {
            if (!this.isRunning) return;
            this.deps.logger.error(
                'Outbox Relay: Failed to setup LISTEN:',
                err,
            );
            this.reconnectListener();
        }
    }

    private reconnectListener() {
        if (this.listenClient) {
            this.listenClient.release();
            this.listenClient = null;
        }
        if (this.isRunning && !this.reconnectTimeoutId) {
            this.deps.logger.warn(
                'Outbox Relay: Attempting to reconnect LISTEN in 5s...',
            );
            this.reconnectTimeoutId = setTimeout(async () => {
                this.reconnectTimeoutId = null;
                await this.setupListener();
            }, 5000);
        }
    }

    private async poll() {
        if (!this.isRunning) return;

        try {
            await this.processBatch();
        } catch (err) {
            this.deps.logger.error(
                'Outbox Relay: Error processing events during poll:',
                err,
            );
        } finally {
            if (this.isRunning) {
                this.timeoutId = setTimeout(() => this.poll(), 10000);
            }
        }
    }
}
