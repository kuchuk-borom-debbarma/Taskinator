import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { DatabasePort } from '../../contracts/index.ts';
import { logger } from '../../logger/index.ts';
import type { Database } from '../types.ts';

export interface PostgresDatabaseConfig {
    database: string;
    host: string;
    user: string;
    password: string;
    port: number;
    max: number;
    idleTimeoutMillis: number;
}

export const postgresConfigFromEnv = (): PostgresDatabaseConfig => ({
    database: process.env.DB_NAME || 'test',
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'password',
    port: Number(process.env.DB_PORT) || 5434,
    max: Number(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
});

export class PostgresDatabaseProvider implements DatabasePort {
    readonly name = 'postgres';
    readonly pool: Pool;
    readonly db: Kysely<Database>;

    constructor(config: PostgresDatabaseConfig = postgresConfigFromEnv()) {
        this.pool = new Pool(config);
        this.pool.on('connect', () =>
            logger.debug('Database: New client connected to pool'),
        );
        this.pool.on('error', (err) =>
            logger.error('Database: Unexpected pool error', err),
        );

        this.db = new Kysely<Database>({
            dialect: new PostgresDialect({ pool: this.pool }),
        });

        logger.info('Database: Kysely instance initialized');
    }

    async destroy() {
        await this.db.destroy();
    }
}
