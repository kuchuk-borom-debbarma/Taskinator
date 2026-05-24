import { pool } from '../../../infra/database/index.ts';

async function wipeSchema() {
    try {
        console.log('🧹 Wiping schema...');
        await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
        console.log('✅ Schema wiped!');
    } catch (err) {
        console.error('❌ Failed to wipe schema:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

wipeSchema();
