import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pool } from '../../../database/index.ts';

async function applySchema() {
    try {
        console.log('📄 Loading schema.sql...');

        // Resolve path to the root database folder
        const schemaPath = resolve(
            import.meta.dir,
            '../../../../database/schema.sql',
        );
        const schemaSql = readFileSync(schemaPath, 'utf-8');

        console.log(
            `🔌 Connecting to Database on port ${process.env.DB_PORT || 5434}...`,
        );

        // Execute the entire schema script directly against the pool
        await pool.query(schemaSql);

        console.log('✅ Schema applied successfully!');
    } catch (err) {
        console.error('❌ Failed to apply schema:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applySchema();
