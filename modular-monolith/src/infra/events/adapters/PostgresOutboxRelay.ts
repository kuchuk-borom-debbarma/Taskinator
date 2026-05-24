import type { Transaction } from 'kysely';
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
            db: { transaction(): any };
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
        await this.deps.db.transaction().execute(async (trx: any) => {
            const events = await this.fetchPendingEvents(trx);
            if (events.length === 0) return;

            this.deps.logger.info(
                `[OutboxRelay] Processing batch of ${events.length} events: ` +
                    `[${events.map((event) => `id=${event.id}, stream=${event.stream}, type=${event.payload.type}`).join('; ')}]`,
            );

            await this.dispatchToEventBus(events);

            const eventIds = events.map((event) => event.id);
            await this.clearProcessedEvents(trx, eventIds);

            if (events.length === 100) {
                setImmediate(() => this.processBatch());
            }
        });
    }

    private async fetchPendingEvents(trx: Transaction<Database>) {
        return await trx
            .selectFrom('outbox_events')
            .selectAll()
            .where('status', '=', 'PENDING')
            .orderBy('created_at', 'asc')
            .limit(100)
            .forUpdate()
            .skipLocked()
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

    private async clearProcessedEvents(
        trx: Transaction<Database>,
        eventIds: number[],
    ) {
        await trx
            .deleteFrom('outbox_events')
            .where('id', 'in', eventIds)
            .execute();
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
