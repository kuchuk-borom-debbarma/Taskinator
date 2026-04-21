import { sql } from 'kysely';
import { db } from '../src/database';

async function migrate() {
    console.log('Migrating outbox_events table...');
    try {
        await sql`ALTER TABLE outbox_events ALTER COLUMN kafka_key DROP NOT NULL`.execute(
            db,
        );
        console.log('Successfully made kafka_key nullable.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

migrate();
