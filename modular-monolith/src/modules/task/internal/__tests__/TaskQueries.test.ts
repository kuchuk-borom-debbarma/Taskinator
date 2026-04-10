/**
 * TIER 1: TaskQueries Integration Tests
 *
 * Runs against the real PostgreSQL database.
 * Verifies:
 *  1. Real SQL executes correctly (fixed deleteTasks wCTE syntax)
 *  2. wCTE outbox_events rows are written atomically alongside mutations
 *  3. Optimistic locking (version check) is enforced on updateTask
 *  4. Auth rules block unauthorized operations
 *  5. Materialized path is computed correctly for hierarchy
 *  6. deleteChildrenTasksBatch correctly handles pagination
 */
import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { db } from '../../../../database/index.ts';
import { cleanupDb, destroyDb } from '../../../../__tests__/helpers/db.ts';
import {
    createUser,
    createProject,
    addProjectMember,
    createTask,
    createChildTask,
} from '../../../../__tests__/helpers/factories.ts';
import {
    insertTask,
    deleteTasks,
    updateTask,
    deleteChildrenTasksBatch,
    deleteAllProjectTasks,
    unassignMemberFromAllTasks,
    getTasks,
} from '../TaskQueries.ts';

describe('TaskQueries — Integration (Real DB + wCTE)', () => {
    let ownerId: string;
    let projectId: string;

    beforeEach(async () => {
        await cleanupDb();
        const owner = await createUser();
        ownerId = owner.id;
        const project = await createProject(ownerId);
        projectId = project.id;
    });

    afterAll(async () => {
        await cleanupDb();
        await destroyDb();
    });

    // ─── insertTask ─────────────────────────────────────────────────────────────

    describe('insertTask', () => {
        it('creates a root task and returns it with camelCase fields', async () => {
            const task = await insertTask({
                userId: ownerId,
                projectId,
                title: 'Root Task',
                description: 'Desc',
                initialStatus: 'TODO',
            });

            expect(task.id).toBeDefined();
            expect(task.title).toBe('Root Task');
            expect(task.projectId).toBe(projectId);
            expect(task.materializedPath).toBe('');
            expect(task.version).toBe(1);
        });

        it('atomically writes an outbox_events row with project.task.created topic', async () => {
            const task = await insertTask({
                userId: ownerId,
                projectId,
                title: 'Outbox Task',
                description: '',
                initialStatus: 'TODO',
            });

            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.task.created')
                .where('kafka_key', '=', task.id)
                .execute();

            expect(outbox).toHaveLength(1);
            expect((outbox[0]!.payload as any).taskId).toBe(task.id);
            expect((outbox[0]!.payload as any).projectId).toBe(projectId);
        });

        it('correctly computes materialized path for a child task', async () => {
            const parent = await insertTask({
                userId: ownerId,
                projectId,
                title: 'Parent',
                description: '',
                initialStatus: 'TODO',
            });

            const child = await insertTask({
                userId: ownerId,
                projectId,
                title: 'Child',
                description: '',
                initialStatus: 'TODO',
                parentTaskId: parent.id,
            });

            // Child's materializedPath = parent.id (since parent has empty path)
            expect(child.materializedPath).toBe(parent.id);
            expect(child.parentTaskId).toBe(parent.id);
        });

        it('computes materializedPath for a grandchild (2-level nesting)', async () => {
            const root = await insertTask({
                userId: ownerId,
                projectId,
                title: 'Root',
                description: '',
                initialStatus: 'TODO',
            });
            const child = await insertTask({
                userId: ownerId,
                projectId,
                title: 'Child',
                description: '',
                initialStatus: 'TODO',
                parentTaskId: root.id,
            });
            const grandchild = await insertTask({
                userId: ownerId,
                projectId,
                title: 'Grandchild',
                description: '',
                initialStatus: 'TODO',
                parentTaskId: child.id,
            });

            expect(grandchild.materializedPath).toBe(`${root.id}/${child.id}`);
        });

        it('throws Unauthorized when user is not a project member or owner', async () => {
            const stranger = await createUser();
            await expect(
                insertTask({
                    userId: stranger.id,
                    projectId,
                    title: 'Sneaky Task',
                    description: '',
                    initialStatus: 'TODO',
                }),
            ).rejects.toThrow('Unauthorized or invalid parameters');
        });

        it('allows a project member to create tasks', async () => {
            const member = await createUser();
            await addProjectMember(projectId, member.id);

            const task = await insertTask({
                userId: member.id,
                projectId,
                title: 'Member Task',
                description: '',
                initialStatus: 'TODO',
            });

            expect(task.id).toBeDefined();
            expect(task.createdBy).toBe(member.id);
        });
    });

    // ─── updateTask ─────────────────────────────────────────────────────────────

    describe('updateTask', () => {
        it('updates a task status and returns its id', async () => {
            const task = await insertTask({
                userId: ownerId,
                projectId,
                title: 'T',
                description: '',
                initialStatus: 'TODO',
            });
            await db.deleteFrom('outbox_events').execute();

            const updatedId = await updateTask({
                userId: ownerId,
                projectId,
                taskId: task.id,
                version: 1,
                status: 'IN_PROGRESS',
            });

            expect(updatedId).toBe(task.id);

            const row = await db
                .selectFrom('project_task')
                .selectAll()
                .where('id', '=', task.id as any)
                .executeTakeFirst();
            expect(row?.status).toBe('IN_PROGRESS');
            expect(row?.version).toBe(2);
        });

        it('atomically writes an outbox_events row with project.task.updated topic', async () => {
            const task = await insertTask({
                userId: ownerId,
                projectId,
                title: 'T',
                description: '',
                initialStatus: 'TODO',
            });
            await db.deleteFrom('outbox_events').execute();

            await updateTask({
                userId: ownerId,
                projectId,
                taskId: task.id,
                version: 1,
                status: 'DONE',
            });

            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.task.updated')
                .execute();

            expect(outbox).toHaveLength(1);
        });

        it('returns null when version does not match (optimistic locking)', async () => {
            const task = await insertTask({
                userId: ownerId,
                projectId,
                title: 'T',
                description: '',
                initialStatus: 'TODO',
            });

            const result = await updateTask({
                userId: ownerId,
                projectId,
                taskId: task.id,
                version: 999, // wrong version
                status: 'DONE',
            });

            expect(result).toBeNull();
        });

        it('returns null for an unauthorized user', async () => {
            const task = await insertTask({
                userId: ownerId,
                projectId,
                title: 'T',
                description: '',
                initialStatus: 'TODO',
            });
            const stranger = await createUser();

            const result = await updateTask({
                userId: stranger.id,
                projectId,
                taskId: task.id,
                version: 1,
                status: 'DONE',
            });

            expect(result).toBeNull();
        });
    });

    // ─── deleteTasks ─────────────────────────────────────────────────────────────

    describe('deleteTasks', () => {
        it('deletes tasks and writes outbox events', async () => {
            const t1 = await createTask(projectId, ownerId, { title: 'T1' });
            const t2 = await createTask(projectId, ownerId, { title: 'T2' });
            await db.deleteFrom('outbox_events').execute();

            const deleted = await deleteTasks({
                userId: ownerId,
                projectId,
                taskIds: [t1.id, t2.id],
            });

            expect(deleted).toHaveLength(2);
            const deletedIds = deleted.map((d) => d.id).sort();
            expect(deletedIds).toEqual([t1.id, t2.id].sort());

            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.task.parent.deleted')
                .execute();
            expect(outbox).toHaveLength(2);
        });

        it('throws when some task IDs are not found (count mismatch)', async () => {
            const t = await createTask(projectId, ownerId);
            await expect(
                deleteTasks({
                    userId: ownerId,
                    projectId,
                    taskIds: [t.id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
                }),
            ).rejects.toThrow('Unauthorized or some tasks not found');
        });

        it('throws when user is not authorized', async () => {
            const task = await createTask(projectId, ownerId);
            const stranger = await createUser();

            await expect(
                deleteTasks({
                    userId: stranger.id,
                    projectId,
                    taskIds: [task.id],
                }),
            ).rejects.toThrow('Unauthorized or some tasks not found');
        });
    });

    // ─── deleteChildrenTasksBatch ─────────────────────────────────────────────

    describe('deleteChildrenTasksBatch', () => {
        it('deletes children of a given parent path and returns hasMore=false when all deleted', async () => {
            const parent = await createTask(projectId, ownerId, {
                title: 'Parent',
            });
            const child1 = await createChildTask(projectId, ownerId, parent, {
                title: 'Child 1',
            });
            const child2 = await createChildTask(projectId, ownerId, parent, {
                title: 'Child 2',
            });

            const parentPath = parent.id; // empty path + id
            const { deletedIds, hasMore } = await deleteChildrenTasksBatch(
                projectId,
                parentPath,
                100,
            );

            expect(deletedIds).toHaveLength(2);
            expect(deletedIds).toContain(child1.id);
            expect(deletedIds).toContain(child2.id);
            expect(hasMore).toBe(false);
        });

        it('returns hasMore=true when more children exist than the batch limit', async () => {
            const parent = await createTask(projectId, ownerId, {
                title: 'Parent',
            });
            // Create 3 children but only delete 2 at a time
            for (let i = 0; i < 3; i++) {
                await createChildTask(projectId, ownerId, parent, {
                    title: `Child ${i}`,
                });
            }

            const parentPath = parent.id;
            const { deletedIds, hasMore } = await deleteChildrenTasksBatch(
                projectId,
                parentPath,
                2,
            );

            expect(deletedIds).toHaveLength(2);
            expect(hasMore).toBe(true);
        });

        it('returns empty result when there are no children', async () => {
            const parent = await createTask(projectId, ownerId, {
                title: 'Leaf',
            });
            const { deletedIds, hasMore } = await deleteChildrenTasksBatch(
                projectId,
                parent.id,
                100,
            );
            expect(deletedIds).toHaveLength(0);
            expect(hasMore).toBe(false);
        });
    });

    // ─── deleteAllProjectTasks ─────────────────────────────────────────────────

    describe('deleteAllProjectTasks', () => {
        it('removes all tasks for a project', async () => {
            await createTask(projectId, ownerId, { title: 'T1' });
            await createTask(projectId, ownerId, { title: 'T2' });

            await deleteAllProjectTasks(projectId);

            const remaining = await db
                .selectFrom('project_task')
                .where('fk_project_id', '=', projectId as any)
                .execute();
            expect(remaining).toHaveLength(0);
        });
    });

    // ─── unassignMemberFromAllTasks ─────────────────────────────────────────────

    describe('unassignMemberFromAllTasks', () => {
        it('nullifies fk_member_id for all tasks assigned to that member', async () => {
            const member = await createUser();
            await addProjectMember(projectId, member.id);

            // Directly assign a task to the member via updateTable
            const task = await createTask(projectId, ownerId);
            await db
                .updateTable('project_task')
                .set({ fk_member_id: member.id })
                .where('id', '=', task.id as any)
                .execute();

            await unassignMemberFromAllTasks(projectId, member.id);

            const updated = await db
                .selectFrom('project_task')
                .selectAll()
                .where('id', '=', task.id as any)
                .executeTakeFirst();

            expect(updated?.fk_member_id).toBeNull();
        });
    });

    // ─── getTasks ────────────────────────────────────────────────────────────────

    describe('getTasks', () => {
        it('returns all tasks for an authorized user, ordered by created_at', async () => {
            await createTask(projectId, ownerId, { title: 'Alpha' });
            await createTask(projectId, ownerId, { title: 'Beta' });

            const tasks = await getTasks(ownerId, projectId);
            expect(tasks.length).toBeGreaterThanOrEqual(2);
        });

        it('returns empty array for an unauthorized user', async () => {
            await createTask(projectId, ownerId, { title: 'Private' });
            const stranger = await createUser();

            const tasks = await getTasks(stranger.id, projectId);
            expect(tasks).toHaveLength(0);
        });
    });
});
