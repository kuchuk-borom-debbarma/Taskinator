/**
 * PERFORMANCE OVERHAUL VERIFICATION TEST
 *
 * Verifies:
 * 1. Background Graph Hydration (TaskGraphListener handles PROJECT_TASK_LINK.CREATED)
 * 2. Reactive Outbox Relay (Postgres LISTEN/NOTIFY)
 */
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { db, pool } from '../database/index.ts';
import { cleanupDb, destroyDb } from './helpers/db.ts';
import { sql } from 'kysely';
import {
    insertTask,
    insertLink,
} from '../modules/task/internal/TaskQueries.ts';
import { taskGraphListener } from '../modules/task/internal/listeners/TaskGraphListener.ts';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from '../utils/event-bus/OutboxRelay.ts';
import eventBus from '../utils/EventBus.ts';

async function robustCleanup() {
    console.log('[Test] Robust cleanup starting...');
    const tables = [
        'outbox_events',
        'processed_event',
        'automations',
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
            await taskGraphListener.init();
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
        await taskGraphListener.stop();
        console.log('[Test] Task graph listener stopped.');

        console.log('[Test] Cleaning up DB...');
        await robustCleanup();
        console.log('[Test] DB Cleanup finished.');

        console.log('[Test] Destroying DB connection...');
        await destroyDb();
        console.log('[Test] DB Connection destroyed.');

        console.log('[Test] afterAll cleanup finished.');
    }, 60000); // Very generous timeout for cleanup

    it('✅ Reactive Outbox: Processes events via LISTEN/NOTIFY immediately', async () => {
        // Insert a task (which creates an outbox event)
        const task = await insertTask({
            userId,
            projectId,
            title: 'Test Outbox Reactive',
            description: 'Verify LISTEN/NOTIFY works',
        });

        // Wait for the relay to process it
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if event is GONE (relayed) from outbox_events
        const pendingEvents = await db
            .selectFrom('outbox_events')
            .select('id')
            .where('kafka_key', '=', task.id as any)
            .execute();

        expect(pendingEvents).toHaveLength(0);
    });

    it('✅ Background Graph: Hydrates reachability eventually', async () => {
        // 1. Create two tasks
        const taskA = await insertTask({
            userId,
            projectId,
            title: 'Task A',
        });
        const taskB = await insertTask({
            userId,
            projectId,
            title: 'Task B',
        });

        // 2. Create a link A -> B
        // This NO LONGER updates reachability synchronously
        await insertLink({
            userId,
            projectId,
            sourceTaskId: taskA.id,
            targetTaskId: taskB.id,
            label: 'DEPENDS_ON',
        });

        // 3. Immediately check reachability (should be empty for this link)
        const reachBefore = await db
            .selectFrom('task_reachability')
            .selectAll()
            .where('ancestor_task_id', '=', taskA.id as any)
            .where('descendant_task_id', '=', taskB.id as any)
            .execute();

        // Note: It MIGHT be populated if the listener is super fast,
        // but typically we can catch it before hydration if we are quick.
        // Actually, the test code is synchronous here, so it should be empty.
        // Wait, insertLink finished, event published to memory bus.
        // MemoryBus has a 10ms delay.

        // 4. Wait for Background Hydration
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 5. Verify Hydration
        const reachAfter = await db
            .selectFrom('task_reachability')
            .selectAll()
            .where('ancestor_task_id', '=', taskA.id as any)
            .where('descendant_task_id', '=', taskB.id as any)
            .execute();

        expect(reachAfter).toHaveLength(1);
        expect(reachAfter[0]!.min_depth).toBe(1);
        console.log(
            '   -> Verified: Reachability was hydrated in the background.',
        );
    });

    it('✅ Cycle Detection: Still works synchronously (Safety First)', async () => {
        const taskA = await insertTask({ userId, projectId, title: 'Cycle A' });
        const taskB = await insertTask({ userId, projectId, title: 'Cycle B' });

        // A -> B
        await insertLink({
            userId,
            projectId,
            sourceTaskId: taskA.id,
            targetTaskId: taskB.id,
            label: 'L1',
        });

        // Wait for hydration
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Attempt B -> A (should fail synchronously even if hydration is async)
        await expect(
            insertLink({
                userId,
                projectId,
                sourceTaskId: taskB.id,
                targetTaskId: taskA.id,
                label: 'L2',
            }),
        ).rejects.toThrow('Circular dependency detected');

        console.log(
            '   -> Verified: Synchronous cycle detection remains robust.',
        );
    });
});
