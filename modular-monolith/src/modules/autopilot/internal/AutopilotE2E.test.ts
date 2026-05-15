import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { db, pool } from '../../../database/index.ts';
import eventBus from '../../../utils/EventBus.ts';
import { projectService } from '../../project/index.ts';
import { taskService } from '../../task/index.ts';
import { autopilotDispatcher } from '../index.ts';

describe('Autopilot E2E', () => {
    beforeAll(async () => {
        await db.deleteFrom('autopilot_action').execute();
        await db.deleteFrom('autopilot').execute();
        await autopilotDispatcher.init();
    });

    afterAll(async () => {
        await pool.end();
    });

    it('should execute a full automation chain: Trigger -> Condition -> Action', async () => {
        // 0. Setup Domain State
        const project = await projectService.createProject({
            actorId: 'test',
            name: 'E2E Project',
        });
        const task = await taskService.createTask({
            actorId: 'test',
            projectId: project!.id,
            title: 'E2E Task',
            status: 'TODO',
            priority: 1,
        });

        // 1. Create Autopilot Definition
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
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        // 2. Create Action for the Autopilot
        await db
            .insertInto('autopilot_action')
            .values({
                fk_autopilot_id: autopilot.id,
                type: 'task.update_priority',
                config: { priority: 99 } as any,
                position: 1,
            })
            .execute();

        // 3. Trigger the Condition (Update status to DONE)
        await db
            .updateTable('project_task')
            .set({ status: 'DONE' })
            .where('id', '=', task.id)
            .execute();

        // 4. Publish the event
        await eventBus.publish('task-events', 'task.updated', {
            key: task.id,
            data: {
                taskId: task.id,
                status: 'DONE',
                type: 'task.updated',
            },
        });

        // 5. Wait for the engine to pick up and run actions
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 6. Verify the Action was executed (Priority should be 99)
        const [updatedTask] = await taskService.getTasksByIds([task.id]);
        expect(updatedTask!.priority).toBe(99);
        expect(updatedTask!.status).toBe('DONE');
    });

    it('should handle team assignment and validation', async () => {
        // 0. Setup Domain State
        const project = await projectService.createProject({
            actorId: 'test',
            name: 'Assignment Project',
        });

        const { teamService } = await import('../../team/index.ts');
        const team = await teamService.createTeam({
            actorId: 'test',
            projectId: project!.id,
            name: 'Dev Team',
        });

        const task = await taskService.createTask({
            actorId: 'test',
            projectId: project!.id,
            title: 'Assignment Task',
            status: 'TODO',
        });

        // 1. Create Autopilot: If status is IN_PROGRESS -> Assign Team
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
                    value: 'IN_PROGRESS',
                } as any,
                is_active: true,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        await db
            .insertInto('autopilot_action')
            .values({
                fk_autopilot_id: autopilot.id,
                type: 'task.assign_team',
                config: { teamId: team.id } as any,
                position: 1,
            })
            .execute();

        // 2. Trigger
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

        // 3. Wait
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 4. Verify
        const [updatedTask] = await taskService.getTasksByIds([task.id]);
        expect(updatedTask!.teamId).toBe(team.id);
        expect(updatedTask!.status).toBe('IN_PROGRESS');
    });
});
