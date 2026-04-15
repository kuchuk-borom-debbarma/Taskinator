/**
 * TIER 2 EDA: Task Deleted — Recursive Child Cleanup Flow
 *
 * Verifies the recursive child-task deletion loop:
 *
 *   deleteTasks (wCTE)
 *       ↓ writes outbox_events[project.task.parent.deleted]
 *   OutboxRelay polls
 *       ↓ publishes PROJECT_TASK_PARENT_DELETED to MemoryBus
 *   task-recursive-cleanup-group (TaskDeleteListener)
 *       ↓ deleteChildrenTasksBatch → if more: re-emits PARENT_DELETED (loop)
 *       ↓ publishes PROJECT_TASK_CHILDREN_DELETED
 */
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from '@jest/globals';
import { db } from '../database/index.ts';
import { cleanupDb, destroyDb } from './helpers/db.ts';
import {
    createUser,
    createProject,
    createTask,
    createChildTask,
} from './helpers/factories.ts';
import { waitFor } from './helpers/waitFor.ts';
import { taskService } from '../modules/task/index.ts';
import { taskDeleteListener as taskRecursiveCleanup } from '../modules/task/internal/listeners/TaskDeleteListener.ts';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from '../utils/event-bus/OutboxRelay.ts';

describe('Task Deleted EDA Flow — Recursive Cleanup', () => {
    let ownerId: string;
    let projectId: string;

    beforeAll(async () => {
        await taskService.init();
        await taskRecursiveCleanup.init();
        startOutboxRelay();
    });

    afterAll(async () => {
        stopOutboxRelay();
        await taskService.destroy();
        await cleanupDb();
        await destroyDb();
    });

    beforeEach(async () => {
        await cleanupDb();
        const owner = await createUser();
        ownerId = owner.id;
        const project = await createProject(ownerId);
        projectId = project.id;
    });

    it('deletes direct children when a root task is deleted', async () => {
        const parent = await createTask(projectId, ownerId, {
            title: 'Parent',
        });
        const child1 = await createChildTask(projectId, ownerId, parent, {
            title: 'C1',
        });
        const child2 = await createChildTask(projectId, ownerId, parent, {
            title: 'C2',
        });

        await taskService.deleteTask({
            userId: ownerId,
            projectId,
            taskIds: [parent.id],
        });

        await waitFor(async () => {
            const remaining = (await db
                .selectFrom('project_task')
                .selectAll()
                .where('fk_project_id', '=', projectId as any)
                .execute()) as any[];
            expect(remaining).toHaveLength(0);
        });

        // Verify children are gone
        for (const childId of [child1.id, child2.id]) {
            const row = await db
                .selectFrom('project_task')
                .selectAll()
                .where('id', '=', childId as any)
                .executeTakeFirst();
            expect(row).toBeUndefined();
        }
    });

    it('recursively deletes grandchildren (3-level hierarchy)', async () => {
        const root = await createTask(projectId, ownerId, { title: 'Root' });
        const child = await createChildTask(projectId, ownerId, root, {
            title: 'Child',
        });
        const grandchild = await createChildTask(projectId, ownerId, child, {
            title: 'Grandchild',
        });

        await taskService.deleteTask({
            userId: ownerId,
            projectId,
            taskIds: [root.id],
        });

        await waitFor(
            async () => {
                const remaining = await db
                    .selectFrom('project_task')
                    .selectAll()
                    .where('fk_project_id', '=', projectId as any)
                    .execute();
                expect(remaining).toHaveLength(0);
            },
            5000, // give extra time for multi-hop event chain
        );

        const grandchildRow = await db
            .selectFrom('project_task')
            .selectAll()
            .where('id', '=', grandchild.id as any)
            .executeTakeFirst();
        expect(grandchildRow).toBeUndefined();
    });
});
