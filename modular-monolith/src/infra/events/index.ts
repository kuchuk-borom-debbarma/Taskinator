import type { EventStorePort } from '../contracts/index.ts';
import { PostgresEventStoreProvider } from './adapters/PostgresEventStoreProvider.ts';

const createEventStoreProvider = (): EventStorePort => {
    const provider =
        process.env.EVENT_STORE_PROVIDER ||
        process.env.DATABASE_PROVIDER ||
        'postgres';

    if (provider === 'postgres') return new PostgresEventStoreProvider();

    throw new Error(`Unsupported EVENT_STORE_PROVIDER "${provider}"`);
};

export const eventStoreProvider = createEventStoreProvider();
