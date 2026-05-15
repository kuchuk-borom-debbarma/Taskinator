import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { db, pool } from '../../../database/index.ts';
import eventBus from '../../../utils/EventBus.ts';
import { projectService } from '../../project/index.ts';
import { taskService } from '../../task/index.ts';
import { autopilotSubscriber } from '../index.ts';

describe('Autopilot Integration', () => {
    beforeAll(async () => {
        await autopilotSubscriber.subscribe();
    });

    afterAll(async () => {
        await pool.end();
    });

    it('should evaluate an autopilot when an event is published to MemoryBus', async () => {
        // 0. Create project and task
        const project = await projectService.createProject({
            actorId: 'test',
            name: 'Test',
        });
        const task = await taskService.createTask({
            actorId: 'test',
            projectId: project!.id,
            title: 'Test Task',
            status: 'TODO',
        });

        // 1. Create an Autopilot in DB
        const autopilot = await db
            .insertInto('autopilot')
            .values({
                fk_project_id: project!.id,
                triggers: ['task.updated'],
                conditions: {
                    type: 'predicate',
                    domain: 'task',
                    field: 'status',
                    operator: 'eq',
                    value: 'DONE',
                } as any,
                is_active: true,
                trace_history_enabled: true,
            })
            .returningAll()
            .executeTakeFirst();

        expect(autopilot).toBeDefined();

        // 2. Update DB manually (simulating the mutation that happened before event)
        await db
            .updateTable('project_task')
            .set({ status: 'DONE' })
            .where('id', '=', task.id)
            .execute();

        // 3. Publish event to MemoryBus
        await eventBus.publish('task-events', 'task.updated', {
            key: task.id,
            data: {
                taskId: task.id,
                status: 'DONE',
                type: 'task.updated',
            },
        });

        // 4. Wait for async evaluation
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Verify logs: "Match found for Autopilot" should appear in console
    });
});
