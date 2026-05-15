import { sql } from 'kysely';
import { db } from './index.ts';

async function run() {
    console.log('[Migration] Creating audit log tables...');

    try {
        await sql`
            CREATE TABLE IF NOT EXISTS autopilot_execution (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                fk_autopilot_id UUID NOT NULL REFERENCES autopilot(id) ON DELETE CASCADE,
                fk_target_id UUID NOT NULL,
                trace_id TEXT NOT NULL,
                trigger_event TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'STARTED',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `.execute(db);

        await sql`
            CREATE TABLE IF NOT EXISTS autopilot_step_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                fk_execution_id UUID NOT NULL REFERENCES autopilot_execution(id) ON DELETE CASCADE,
                action_type TEXT NOT NULL,
                status TEXT NOT NULL,
                error_message TEXT,
                position INTEGER NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `.execute(db);

        await sql`CREATE INDEX IF NOT EXISTS idx_audit_trace ON autopilot_execution(trace_id)`.execute(
            db,
        );
        await sql`CREATE INDEX IF NOT EXISTS idx_audit_autopilot ON autopilot_execution(fk_autopilot_id)`.execute(
            db,
        );
        await sql`CREATE INDEX IF NOT EXISTS idx_step_execution ON autopilot_step_log(fk_execution_id)`.execute(
            db,
        );

        console.log('[Migration] Success! Audit log tables created.');
    } catch (e) {
        console.error('[Migration] Failed:', e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

run();
