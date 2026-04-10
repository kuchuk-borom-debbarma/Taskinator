/**
 * TIER 2 EDA: Task Updated → Trigger Dispatch → Trigger Execution
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

    it('executes SEQUENCE_UNLOCK trigger when Task A is DONE', async () => {
        const taskA = await createTask(projectId, ownerId, { title: 'Task A' });
        const taskB = await createTask(projectId, ownerId, { title: 'Task B', status: 'BLOCKED' });

        await createTaskTrigger({
            projectId,
            taskId: taskA.id,
            triggerType: 'SEQUENCE_UNLOCK',
            triggerData: { targetTaskId: taskB.id, targetStatusToSet: 'TODO' },
            name: 'Unlock B',
        });

        await db.deleteFrom('outbox_events').execute();

        await taskService.updateTasks({
            userId: ownerId,
            projectId,
            tasks: [{ id: taskA.id, version: 1, status: 'DONE' }],
        });

        await waitFor(async () => {
            const rowB = await db
                .selectFrom('project_task')
                .selectAll()
                .where('id', '=', taskB.id as any)
                .executeTakeFirst();
            expect(rowB?.status).toBe('TODO');
        }, 5000);
    });

    it('executes BLOCK_PARENT_DONE trigger and reverts parent status', async () => {
        const parent = await createTask(projectId, ownerId, { title: 'Parent', status: 'IN_PROGRESS' });
        const child = await createChildTask(projectId, ownerId, parent, { title: 'Child', status: 'TODO' });

        await createTaskTrigger({
            projectId,
            taskId: parent.id,
            triggerType: 'BLOCK_PARENT_DONE',
            triggerData: { revertStatusTo: 'IN_PROGRESS' },
            name: 'GuardParent',
        });

        await db.deleteFrom('outbox_events').execute();

        // Attempt to mark parent as DONE while child is still TODO
        await taskService.updateTasks({
            userId: ownerId,
            projectId,
            tasks: [{ id: parent.id, version: 1, status: 'DONE' }],
        });

        // Trigger should detect incomplete child and revert parent to IN_PROGRESS
        await waitFor(async () => {
            const parentRow = await db
                .selectFrom('project_task')
                .selectAll()
                .where('id', '=', parent.id as any)
                .executeTakeFirst();
            expect(parentRow?.status).toBe('IN_PROGRESS');
        }, 5000);
    });

    it('does not change status if no trigger is registered', async () => {
        const taskA = await createTask(projectId, ownerId, { title: 'Task A' });
        const taskB = await createTask(projectId, ownerId, { title: 'Task B', status: 'BLOCKED' });

        await db.deleteFrom('outbox_events').execute();

        await taskService.updateTasks({
            userId: ownerId,
            projectId,
            tasks: [{ id: taskA.id, version: 1, status: 'DONE' }],
        });

        await new Promise((r) => setTimeout(r, 500));

        const rowB = await db
            .selectFrom('project_task')
            .selectAll()
            .where('id', '=', taskB.id as any)
            .executeTakeFirst();
        expect(rowB?.status).toBe('BLOCKED');
    });
});
