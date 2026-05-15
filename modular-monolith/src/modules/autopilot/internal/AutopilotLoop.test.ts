import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { db, pool } from '../../../database/index.ts';
import eventBus from '../../../utils/EventBus.ts';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from '../../../utils/event-bus/OutboxRelay.ts';
import { projectService } from '../../project/index.ts';
import { taskService } from '../../task/index.ts';
import { autopilotDispatcher } from '../index.ts';

describe('Autopilot Loop Detection E2E', () => {
    beforeAll(async () => {
        await db.deleteFrom('autopilot_action').execute();
        await db.deleteFrom('autopilot').execute();
        await autopilotDispatcher.init();
        startOutboxRelay();
    });

    afterAll(async () => {
        stopOutboxRelay();
        await pool.end();
    });

    it('should terminate an infinite loop between two autopilots', async () => {
        const project = await projectService.createProject({
            actorId: 'test',
            name: 'Loop Project',
        });
        const task = await taskService.createTask({
            actorId: 'test',
            projectId: project!.id,
            title: 'Loop Task',
            status: 'BACKLOG',
        });

        // 1. Autopilot A: IN_PROGRESS -> DONE
        const autopilotA = await db
            .insertInto('autopilot')
            .values({
                fk_project_id: project!.id,
                triggers: ['task.updated'],
                conditions: {
                    type: 'predicate',
                    domain: 'task',
                    field: 'status',
                    operator: 'eq',
                    value: 'IN_PROGRESS',
                } as any,
                is_active: true,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        await db
            .insertInto('autopilot_action')
            .values({
                fk_autopilot_id: autopilotA.id,
                type: 'task.update_status',
                config: { status: 'DONE' } as any,
                position: 1,
            })
            .execute();

        // 2. Autopilot B: DONE -> IN_PROGRESS
        const autopilotB = await db
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
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        await db
            .insertInto('autopilot_action')
            .values({
                fk_autopilot_id: autopilotB.id,
                type: 'task.update_status',
                config: { status: 'IN_PROGRESS' } as any,
                position: 1,
            })
            .execute();

        // 3. Trigger the loop
        // Manually update to IN_PROGRESS and publish event
        await db
            .updateTable('project_task')
            .set({ status: 'IN_PROGRESS' })
            .where('id', '=', task.id)
            .execute();

        await eventBus.publish('task-events', 'task.updated', {
            key: task.id,
            data: {
                taskId: task.id,
                status: 'IN_PROGRESS',
                type: 'task.updated',
            },
        });

        // 4. Wait for the dust to settle
        // Each hop is async via OutboxRelay (which uses safety poll or LISTEN)
        // MemoryBus has 10ms delay. OutboxRelay might have some latency.
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // 5. Verify the task stopped at some state and didn't crash the system
        const [finalTask] = await taskService.getTasksByIds([task.id]);

        console.log(`Final Task Version: ${finalTask!.version}`);

        // With depth 10, it should have toggled several times.
        // 1 (Create) + 1 (Manual) + 10 (Autopilot hops) = 12
        expect(finalTask!.version).toBeGreaterThan(5);
        expect(finalTask!.version).toBeLessThanOrEqual(12);
    });
});
