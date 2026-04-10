/**
 * TIER 2 EDA: Task Updated → Trigger Dispatch → Trigger Execution
 *
 * Verifies the full trigger chain when a task is updated:
 *
 *   updateTask (wCTE)
 *       ↓ writes outbox_events[project.task.updated]
 *   OutboxRelay polls
 *       ↓ publishes PROJECT_TASK_UPDATED to MemoryBus
 *   task-update-trigger-delegate-group (ProjectTaskUpdatedListener)
 *       ↓ fetches triggers for the task
 *       ↓ publishes PROJECT_TASK_TRIGGER for each trigger
 *   task-trigger-processor-group (TaskTriggerListener)
 *       ↓ executes the trigger processor (e.g., UPDATE_PARENT_STATUS)
 *   updateParentStatusTrigger
 *       ↓ updateParentTaskStatus (wCTE: updates parent + writes new outbox_events)
 *
 * The final assertion is that the parent task's status is changed in the DB.
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
    createTaskTrigger,
} from './helpers/factories.ts';
import { waitFor } from './helpers/waitFor.ts';
import { taskService } from '../modules/task/index.ts';
import { taskTriggerService } from '../modules/task-trigger/index.ts';
import { taskTriggerListener as taskUpdateDelegator } from '../modules/task-trigger/internal/listeners/ProjectTaskUpdatedListener.ts';
import { taskTriggerListener as triggerProcessor } from '../modules/task-trigger/internal/listeners/TaskTriggerListener.ts';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from '../utils/event-bus/OutboxRelay.ts';

describe('Task Update → Trigger Dispatch → Execution EDA Flow', () => {
    let ownerId: string;
    let projectId: string;

    beforeAll(async () => {
        await taskService.init();
        await taskTriggerService.init();
        await taskUpdateDelegator.init();
        await triggerProcessor.init();
        startOutboxRelay();
    });

    afterAll(async () => {
        stopOutboxRelay();
        await taskUpdateDelegator.stop();
        await triggerProcessor.stop();
        await taskService.destroy();
        await taskTriggerService.destroy();
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

    it('executes UPDATE_PARENT_STATUS trigger when a child task is updated', async () => {
        // Setup: parent task + child task
        const parent = await createTask(projectId, ownerId, {
            title: 'Parent',
            status: 'TODO',
        });
        const child = await createChildTask(projectId, ownerId, parent, {
            title: 'Child',
            status: 'TODO',
        });

        // Register an UPDATE_PARENT_STATUS trigger on the child
        await createTaskTrigger({
            projectId,
            taskId: child.id,
            triggerType: 'UPDATE_PARENT_STATUS',
            triggerData: { parentStatusToSet: 'DONE' },
            name: 'AutoClose',
        });

        // Clear any outbox events from setup
        await db.deleteFrom('outbox_events').execute();

        // Act: update the child task (triggers the EDA chain)
        await taskService.updateTasks({
            userId: ownerId,
            projectId,
            tasks: [{ id: child.id, version: 1, status: 'COMPLETED' }],
        });

        // Assert: parent task's status is eventually updated to 'DONE'
        await waitFor(async () => {
            const parentRow = await db
                .selectFrom('project_task')
                .selectAll()
                .where('id', '=', parent.id as any)
                .executeTakeFirst();

            expect(parentRow?.status).toBe('DONE');
        }, 5000);
    });

    it('does not change parent status if no trigger is registered on the child', async () => {
        const parent = await createTask(projectId, ownerId, {
            title: 'Parent',
            status: 'TODO',
        });
        const child = await createChildTask(projectId, ownerId, parent, {
            title: 'Child',
        });

        // No trigger registered
        await db.deleteFrom('outbox_events').execute();

        await taskService.updateTasks({
            userId: ownerId,
            projectId,
            tasks: [{ id: child.id, version: 1, status: 'DONE' }],
        });

        // Wait for any async processing to stabilize
        await new Promise((r) => setTimeout(r, 500));

        const parentRow = await db
            .selectFrom('project_task')
            .selectAll()
            .where('id', '=', parent.id as any)
            .executeTakeFirst();

        // Parent should remain TODO
        expect(parentRow?.status).toBe('TODO');
    });

    it('writes a new outbox event after the trigger updates the parent status', async () => {
        const parent = await createTask(projectId, ownerId, {
            title: 'Parent',
            status: 'IN_PROGRESS',
        });
        const child = await createChildTask(projectId, ownerId, parent, {
            title: 'Child',
        });

        await createTaskTrigger({
            projectId,
            taskId: child.id,
            triggerType: 'UPDATE_PARENT_STATUS',
            triggerData: { parentStatusToSet: 'DONE' },
        });

        await db.deleteFrom('outbox_events').execute();
        await taskService.updateTasks({
            userId: ownerId,
            projectId,
            tasks: [{ id: child.id, version: 1, status: 'DONE' }],
        });

        // After trigger runs, updateParentTaskStatus writes another outbox event
        await waitFor(async () => {
            const outbox = await db
                .selectFrom('outbox_events')
                .selectAll()
                .where('kafka_topic', '=', 'project.task.updated')
                .where('kafka_key', '=', parent.id)
                .execute();

            expect(outbox.length).toBeGreaterThanOrEqual(1);
            expect((outbox[0]!.payload as any).taskId).toBe(parent.id);
            expect((outbox[0]!.payload as any).userId).toBe('SYSTEM');
        }, 5000);
    });

    it('handles multiple triggers on the same task', async () => {
        const parent = await createTask(projectId, ownerId, {
            title: 'Parent',
            status: 'TODO',
        });
        const child = await createChildTask(projectId, ownerId, parent, {
            title: 'Child',
        });

        // Register the same trigger twice (edge case)
        await createTaskTrigger({
            projectId,
            taskId: child.id,
            triggerType: 'UPDATE_PARENT_STATUS',
            triggerData: { parentStatusToSet: 'DONE' },
            name: 'Trigger 1',
        });
        await createTaskTrigger({
            projectId,
            taskId: child.id,
            triggerType: 'UPDATE_PARENT_STATUS',
            triggerData: { parentStatusToSet: 'DONE' },
            name: 'Trigger 2',
        });

        await db.deleteFrom('outbox_events').execute();

        await taskService.updateTasks({
            userId: ownerId,
            projectId,
            tasks: [{ id: child.id, version: 1, status: 'DONE' }],
        });

        // Parent eventually gets DONE (possibly from second trigger since first may set it,
        // and second still succeeds since version bumps are per-trigger)
        await waitFor(async () => {
            const parentRow = await db
                .selectFrom('project_task')
                .selectAll()
                .where('id', '=', parent.id as any)
                .executeTakeFirst();
            expect(parentRow?.status).toBe('DONE');
        }, 5000);
    });
});
