import { createProject, createUser } from '../__tests__/helpers/factories.ts';
import { db } from '../database/index.ts';
import { logger } from '../logger/index.ts';
import { BehaviorTaskEventConsumer } from '../modules/task/internal/listeners/BehaviorTaskEventConsumer.ts';
import { expandTaskReachability } from '../modules/task/internal/TaskQueries.ts';
import { TaskServiceImpl } from '../modules/task/internal/TaskServiceImpl.ts';
import { KAFKA_EVENTS } from '../utils/event-bus/constants.ts';

async function run() {
    logger.info('Starting Phase 3 Verification: Cascades...');

    const user = await createUser();
    const project = await createProject(user.id);
    const taskService = new TaskServiceImpl();
    const consumer = new BehaviorTaskEventConsumer();

    // 1. Setup Tasks for CASCADE_DELETE
    const parentDelete = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Parent Delete',
    });

    const subtaskDelete = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Subtask Delete',
    });

    await db.transaction().execute(async (trx) => {
        await expandTaskReachability(
            trx as any,
            project.id,
            parentDelete.id,
            subtaskDelete.id,
        );
    });

    logger.info('Testing CASCADE_DELETE...');
    await db
        .insertInto('behavior_rule')
        .values({
            fk_project_id: project.id as any,
            name: 'Cascade Delete',
            behavior_type: 'CASCADE_DELETE',
            criteria_field: 'status',
            criteria_operator: 'EQUALS',
            criteria_value: 'DELETED', // Not used strictly since DELETED event triggers it, but we can simulate
            is_active: true,
        })
        .execute();

    // Trigger consumer with a DELETED event
    await consumer.handleTaskEvents([
        {
            eventId: '1',
            type: KAFKA_EVENTS.TASK.DELETED,
            key: project.id,
            timestamp: new Date().toISOString(),
            data: {
                projectId: project.id,
                taskId: parentDelete.id,
                actorId: user.id,
                status: 'DELETED', // for matching criteria if used
            },
        },
    ]);

    const deletedSubtasks = await taskService.getTasksByIds([subtaskDelete.id]);
    if (deletedSubtasks.length !== 0) {
        throw new Error('FAILED: CASCADE_DELETE did not delete subtask');
    }
    logger.info('PASSED: CASCADE_DELETE');

    // 2. Setup Tasks for TEAM_CASCADE
    logger.info('Testing TEAM_CASCADE...');
    const parentTeam = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Parent Team',
    });

    const subtaskTeam = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Subtask Team',
    });

    await db.transaction().execute(async (trx) => {
        await expandTaskReachability(
            trx as any,
            project.id,
            parentTeam.id,
            subtaskTeam.id,
        );
    });

    const teamId = crypto.randomUUID();

    await db
        .insertInto('behavior_rule')
        .values({
            fk_project_id: project.id as any,
            name: 'Cascade Team',
            behavior_type: 'TEAM_CASCADE',
            criteria_field: 'teamId',
            criteria_operator: 'EQUALS',
            criteria_value: teamId,
            action_value: teamId,
            is_active: true,
        })
        .execute();

    await consumer.handleTaskEvents([
        {
            eventId: '2',
            type: KAFKA_EVENTS.TASK.UPDATED,
            key: project.id,
            timestamp: new Date().toISOString(),
            data: {
                projectId: project.id,
                taskId: parentTeam.id,
                actorId: user.id,
                teamId: teamId,
            },
        },
    ]);

    const teamSubtasks = await taskService.getTasksByIds([subtaskTeam.id]);
    if (teamSubtasks[0]?.teamId !== teamId) {
        throw new Error(
            `FAILED: TEAM_CASCADE failed. Expected ${teamId}, got ${teamSubtasks[0]?.teamId}`,
        );
    }
    logger.info('PASSED: TEAM_CASCADE');

    // 3. Setup Tasks for PRIORITY_CASCADE
    logger.info('Testing PRIORITY_CASCADE...');
    const parentPriority = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Parent Priority',
    });

    const subtaskPriority = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Subtask Priority',
    });

    await db.transaction().execute(async (trx) => {
        await expandTaskReachability(
            trx as any,
            project.id,
            parentPriority.id,
            subtaskPriority.id,
        );
    });

    await db
        .insertInto('behavior_rule')
        .values({
            fk_project_id: project.id as any,
            name: 'Cascade Priority',
            behavior_type: 'PRIORITY_CASCADE',
            criteria_field: 'priority',
            criteria_operator: 'GREATER_THAN',
            criteria_value: '5',
            action_value: '10',
            is_active: true,
        })
        .execute();

    await consumer.handleTaskEvents([
        {
            eventId: '3',
            type: KAFKA_EVENTS.TASK.UPDATED,
            key: project.id,
            timestamp: new Date().toISOString(),
            data: {
                projectId: project.id,
                taskId: parentPriority.id,
                actorId: user.id,
                priority: 8, // > 5, matches criteria
            },
        },
    ]);

    const prioritySubtasks = await taskService.getTasksByIds([
        subtaskPriority.id,
    ]);
    if (prioritySubtasks[0]?.priority !== 10) {
        throw new Error('FAILED: PRIORITY_CASCADE failed.');
    }
    logger.info('PASSED: PRIORITY_CASCADE');

    // 4. Setup Tasks for BLOCKER_RESOLUTION
    logger.info('Testing BLOCKER_RESOLUTION...');
    const blockerTask = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Blocker Task',
    });

    const blockedTask = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Blocked Task',
    });

    await taskService.createTaskLink({
        actorId: user.id,
        projectId: project.id,
        sourceTaskId: blockerTask.id,
        targetTaskId: blockedTask.id,
        label: 'blocks',
    });

    await db
        .insertInto('behavior_rule')
        .values({
            fk_project_id: project.id as any,
            name: 'Resolve Blocker',
            behavior_type: 'BLOCKER_RESOLUTION',
            criteria_field: 'status',
            criteria_operator: 'EQUALS',
            criteria_value: 'DONE',
            action_value: 'READY',
            is_active: true,
        })
        .execute();

    await consumer.handleTaskEvents([
        {
            eventId: '4',
            type: KAFKA_EVENTS.TASK.UPDATED,
            key: project.id,
            timestamp: new Date().toISOString(),
            data: {
                projectId: project.id,
                taskId: blockerTask.id,
                actorId: user.id,
                status: 'DONE',
            },
        },
    ]);

    const resolvedBlockedTask = await taskService.getTasksByIds([
        blockedTask.id,
    ]);
    if (resolvedBlockedTask[0]?.status !== 'READY') {
        throw new Error(
            `FAILED: BLOCKER_RESOLUTION failed. Expected READY, got ${resolvedBlockedTask[0]?.status}`,
        );
    }
    logger.info('PASSED: BLOCKER_RESOLUTION');

    logger.info('Phase 3 Verification PASSED');
    process.exit(0);
}

run().catch((e) => {
    logger.error('Phase 3 Verification FAILED', e);
    process.exit(1);
});
