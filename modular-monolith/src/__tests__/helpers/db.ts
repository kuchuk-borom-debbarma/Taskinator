import { db } from '../../database/index.ts';

/**
 * Truncates all tables in FK-safe order.
 * Call in `beforeEach` or `afterEach` to guarantee a clean slate.
 */
export async function cleanupDb(): Promise<void> {
    await db.deleteFrom('outbox_events').execute();
    await db.deleteFrom('processed_event').execute();
    await db.deleteFrom('automation_rules').execute();
    await db.deleteFrom('project_task').execute();
    await db.deleteFrom('project_team_member').execute();
    await db.deleteFrom('project_team').execute();
    await db.deleteFrom('project_member').execute();
    await db.deleteFrom('project').execute();
    await db.deleteFrom('pending_users').execute();
    await db.deleteFrom('users').execute();
}

/**
 * Destroy the Kysely pool — call once in afterAll of test suites that don't
 * share the db instance across files.
 */
export async function destroyDb(): Promise<void> {
    await db.destroy();
}
