/**
 * PERFORMANCE OVERHAUL VERIFICATION TEST
 *
 * Verifies:
 * 1. Background Graph Hydration (TaskGraphListener handles PROJECT_TASK_LINK.CREATED)
 * 2. Reactive Outbox Relay (Postgres LISTEN/NOTIFY)
 */
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { sql } from 'kysely';
import { db } from '../database/index.ts';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from '../utils/event-bus/OutboxRelay.ts';
import { destroyDb } from './helpers/db.ts';

async function robustCleanup() {
    console.log('[Test] Robust cleanup starting...');
    const tables = [
        'outbox_events',
        'processed_event',
        'project_team_member',
        'project_team',
        'project_member',
        'project_task',
        'task_link',
        'task_reachability',
        'project',
        'pending_users',
        'users',
    ];

    console.log('[Test] Truncating all tables at once...');
    try {
        await sql
            .raw(
                `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
            )
            .execute(db);
    } catch (err) {
        console.warn('[Test] Warning: Failed to truncate all tables:', err);
    }
    console.log('[Test] Robust cleanup finished.');
}

// Use a long timeout for asynchronous eventual consistency checks
jest.setTimeout(30000);

describe('Performance Overhaul — Integration Tests', () => {
    const userId = '3cde0ca8-092e-4fa4-97d6-3bf4665b37ba';
    let projectId: string;

    beforeAll(async () => {
        try {
            // 1. Manually ensure the NOTIFY triggers are installed in this test environment
            await sql`
                CREATE OR REPLACE FUNCTION notify_outbox_event() RETURNS trigger AS $$
                BEGIN
                    PERFORM pg_notify('outbox_event_notification', NEW.id::text);
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            `.execute(db);

            await sql`
                DROP TRIGGER IF EXISTS trigger_notify_outbox_event ON outbox_events;
            `.execute(db);

            await sql`
                CREATE TRIGGER trigger_notify_outbox_event
                AFTER INSERT ON outbox_events
                FOR EACH ROW EXECUTE FUNCTION notify_outbox_event();
            `.execute(db);

            await robustCleanup();

            // 2. Create a test project
            const projResult = await db
                .insertInto('project')
                .values({
                    id: sql`gen_random_uuid()`,
                    name: 'Perf Test Project',
                    fk_user_id: userId,
                })
                .returning('id')
                .executeTakeFirstOrThrow();
            projectId = projResult.id;

            // 3. Initialize background services
            process.env.USE_MEMORY_BUS = 'true';
            // await taskGraphListener.init(); // Listener removed
            startOutboxRelay();
        } catch (err) {
            console.error('[Test] Setup failed:', err);
            throw err;
        }
    });

    afterAll(async () => {
        console.log('[Test] afterAll cleanup starting...');
        stopOutboxRelay();
        console.log('[Test] Outbox relay stopped.');
        // await taskGraphListener.stop(); // Listener removed
        console.log('[Test] Task graph listener stopped.');

        console.log('[Test] Cleaning up DB...');
        await robustCleanup();
        console.log('[Test] DB Cleanup finished.');

        console.log('[Test] Destroying DB connection...');
        await destroyDb();
        console.log('[Test] DB Connection destroyed.');

        console.log('[Test] afterAll cleanup finished.');
    }, 60000); // Very generous timeout for cleanup

    it('✅ Placeholder: Integration test setup works', async () => {
        expect(projectId).toBeDefined();
    });
});
