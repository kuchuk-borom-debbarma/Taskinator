import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { db } from '../../../database/index.ts';
import eventBus from '../../../utils/EventBus.ts';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from '../../../utils/event-bus/OutboxRelay.ts';
import { taskService } from '../../task/index.ts';
import { autopilotDispatcher } from '../index.ts';

describe('Audit Logging & Progress Tracking', () => {
    let projectId: string;
    let teamId: string;

    beforeAll(async () => {
        // Setup infrastructure
        await eventBus.init();
        await autopilotDispatcher.init();
        startOutboxRelay();

        // 1. Create a Project and Team
        const project = await db
            .insertInto('project')
            .values({
                name: 'Audit Test Project',
                fk_user_id: '80e14529-65b1-4770-9824-3450d0322c34',
            })
            .returning('id')
            .executeTakeFirstOrThrow();
        projectId = project.id;

        await db
            .insertInto('project_member')
            .values({
                fk_project_id: projectId,
                fk_user_id: '80e14529-65b1-4770-9824-3450d0322c34',
            })
            .execute();

        const team = await db
            .insertInto('project_team')
            .values({
                name: 'Audit Team',
                fk_project_id: projectId,
                fk_user_id: '80e14529-65b1-4770-9824-3450d0322c34',
            })
            .returning('id')
            .executeTakeFirstOrThrow();
        teamId = team.id;
    });

    afterAll(async () => {
        stopOutboxRelay();
        await eventBus.destroy();
    });

    it('should log execution start, match, and individual steps', async () => {
        // 2. Create an Autopilot with multiple actions
        const autopilot = await db
            .insertInto('autopilot')
            .values({
                fk_project_id: projectId,
                triggers: ['task.updated'],
                conditions: {
                    type: 'predicate',
                    operator: 'eq',
                    field: 'status',
                    domain: 'task',
                    value: 'IN_PROGRESS',
                } as any,
                is_active: true,
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        // Action 1: Assign Team
        await db
            .insertInto('autopilot_action')
            .values({
                fk_autopilot_id: autopilot.id,
                type: 'task.assign_team',
                config: { teamId },
                position: 1,
            })
            .execute();

        // Action 2: Update Status to DONE
        await db
            .insertInto('autopilot_action')
            .values({
                fk_autopilot_id: autopilot.id,
                type: 'task.update_status',
                config: { status: 'DONE' },
                position: 2,
            })
            .execute();

        // 3. Create a task and trigger the autopilot
        const task = await taskService.createTask({
            projectId,
            title: 'Audit Me',
            status: 'TODO',
            actorId: '80e14529-65b1-4770-9824-3450d0322c34',
        });

        // Trigger: Update to IN_PROGRESS
        await taskService.updateTask({
            taskId: task.id,
            projectId,
            status: 'IN_PROGRESS',
            version: task.version,
            actorId: '80e14529-65b1-4770-9824-3450d0322c34',
        });

        // 4. Wait for processing (via OutboxRelay)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 5. Verify Audit Logs
        const execution = await db
            .selectFrom('autopilot_execution')
            .where('fk_autopilot_id', '=', autopilot.id)
            .selectAll()
            .executeTakeFirst();

        expect(execution).toBeDefined();
        expect(execution!.status).toBe('COMPLETED');
        expect(execution!.trigger_event).toBe('task.updated');

        const steps = await db
            .selectFrom('autopilot_step_log')
            .where('fk_execution_id', '=', execution!.id)
            .orderBy('position', 'asc')
            .selectAll()
            .execute();

        expect(steps.length).toBe(2);
        expect(steps[0].action_type).toBe('task.assign_team');
        expect(steps[0].status).toBe('SUCCESS');
        expect(steps[1].action_type).toBe('task.update_status');
        expect(steps[1].status).toBe('SUCCESS');
    });
});
