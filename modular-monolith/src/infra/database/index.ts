import type { Pool } from 'pg';
import type { DatabasePort } from '../contracts/index.ts';
import { PostgresDatabaseProvider } from './adapters/PostgresDatabaseProvider.ts';

export type { Database } from './types.ts';

const createDatabaseProvider = (): DatabasePort => {
    const provider = process.env.DATABASE_PROVIDER || 'postgres';

    if (provider === 'postgres') return new PostgresDatabaseProvider();

    throw new Error(`Unsupported DATABASE_PROVIDER "${provider}"`);
};

export const databaseProvider = createDatabaseProvider();
export const db = databaseProvider.db;

const requirePool = (): Pool => {
    if (!databaseProvider.pool) {
        throw new Error(
            `Database provider "${databaseProvider.name}" does not expose a pg Pool`,
        );
    }
    return databaseProvider.pool;
};

export const pool = requirePool();
