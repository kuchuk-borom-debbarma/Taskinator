import { createInfrastructure } from './contracts/index.ts';
import { databaseProvider } from './database/index.ts';
import { eventStoreProvider } from './events/index.ts';
import { eventRelayProvider } from './events/relay.ts';
import { logger } from './logger/index.ts';
import { cacheProvider } from './redis/index.ts';
import { eventBusProvider } from './utils/event-bus/index.ts';

export type * from './contracts/index.ts';

export const infra = createInfrastructure({
    database: databaseProvider,
    cache: cacheProvider,
    eventBus: eventBusProvider,
    eventStore: eventStoreProvider,
    eventRelay: eventRelayProvider,
    logger,
});
