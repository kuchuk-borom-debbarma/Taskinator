import type { EventRelayPort } from '../contracts/index.ts';
import { databaseProvider, db, pool } from '../database/index.ts';
import { logger } from '../logger/index.ts';
import eventBus from '../utils/EventBus.ts';
import { PostgresOutboxRelay } from './adapters/PostgresOutboxRelay.ts';

const createEventRelayProvider = (): EventRelayPort => {
    const provider =
        process.env.EVENT_RELAY_PROVIDER || databaseProvider.name || 'postgres';

    if (provider === 'postgres') {
        return new PostgresOutboxRelay({ db, pool, eventBus, logger });
    }

    throw new Error(`Unsupported EVENT_RELAY_PROVIDER "${provider}"`);
};

export const eventRelayProvider = createEventRelayProvider();
