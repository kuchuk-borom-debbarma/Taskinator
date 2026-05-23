import * as fs from 'node:fs';
import * as path from 'node:path';
import { sql } from 'kysely';
import { db } from './index.ts';

async function run() {
    console.log('[Migration] Starting CWB initialization migration...');

    try {
        const sqlPath = path.join(
            process.cwd(),
            'database',
            'migration_cwb_init.sql',
        );
        const migrationSql = fs.readFileSync(sqlPath, 'utf8');

        console.log(
            '[Migration] Executing SQL from database/migration_cwb_init.sql...',
        );

        // Split by semicolon and execute individually if needed,
        // but Kysely's sql template can handle multiple statements if the driver allows.
        // Postgres driver allows multiple statements in one query.
        await sql.raw(migrationSql).execute(db);

        console.log(
            '[Migration] Success! CWB table created and legacy data wiped.',
        );
    } catch (e) {
        console.error('[Migration] Failed:', e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

run();
