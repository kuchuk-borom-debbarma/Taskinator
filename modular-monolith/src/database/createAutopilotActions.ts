import { sql } from 'kysely';
import { db } from './index.ts';

async function run() {
    console.log('[Migration] Creating autopilot_action table...');

    try {
        await sql`
            CREATE TABLE IF NOT EXISTS autopilot_action (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                fk_autopilot_id UUID NOT NULL REFERENCES autopilot(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                config JSONB NOT NULL DEFAULT '{}',
                position INTEGER NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `.execute(db);

        await sql`CREATE INDEX IF NOT EXISTS idx_autopilot_action_fk ON autopilot_action(fk_autopilot_id)`.execute(
            db,
        );

        console.log('[Migration] Success! autopilot_action table created.');
    } catch (e) {
        console.error('[Migration] Failed:', e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

run();
