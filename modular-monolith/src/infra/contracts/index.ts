import type { Kysely } from 'kysely';
import type { Pool } from 'pg';
import type { Database } from '../database/types.ts';
import type { Logger } from '../logger/index.ts';
import type { Bus, DomainEvent } from '../utils/event-bus/types.ts';

export interface InfrastructurePort {
    readonly name: string;
}

export interface LifecyclePort extends InfrastructurePort {
    init?(): Promise<void>;
    destroy?(): Promise<void>;
}

export interface DatabasePort extends LifecyclePort {
    readonly db: Kysely<Database>;
    readonly pool?: Pool;
}

export interface CachePort<Client = unknown> extends LifecyclePort {
    readonly instanceId: string;
    getPublisher(): Client;
    getSubscriber(): Client;
}

export interface EventBusPort extends LifecyclePort {
    readonly bus: Bus;
}

export interface OutboxEntry {
    event_id?: string;
    stream: string;
    stream_key?: string | null;
    payload: any;
}

export interface EventStorePort extends InfrastructurePort {
    appendOutboxEvents(trx: any, entries: OutboxEntry[]): Promise<void>;
    claimEvents(
        trx: any,
        events: DomainEvent[],
        groupId: string,
    ): Promise<DomainEvent[]>;
}

export interface EventRelayPort extends InfrastructurePort {
    start(): void;
    stop(): void;
    processBatch(): Promise<void>;
}

export interface Infrastructure {
    readonly database: DatabasePort;
    readonly cache: CachePort;
    readonly eventBus: EventBusPort;
    readonly eventStore: EventStorePort;
    readonly eventRelay: EventRelayPort;
    readonly logger: Logger;
    init(): Promise<void>;
    destroy(): Promise<void>;
}

export const createInfrastructure = (deps: {
    database: DatabasePort;
    cache: CachePort;
    eventBus: EventBusPort;
    eventStore: EventStorePort;
    eventRelay: EventRelayPort;
    logger: Logger;
}): Infrastructure => ({
    ...deps,
    async init() {
        await Promise.all([
            deps.database.init?.(),
            deps.cache.init?.(),
            deps.eventBus.init?.(),
        ]);
    },
    async destroy() {
        deps.eventRelay.stop();
        await Promise.all([
            deps.eventBus.destroy?.(),
            deps.cache.destroy?.(),
            deps.database.destroy?.(),
        ]);
    },
});
