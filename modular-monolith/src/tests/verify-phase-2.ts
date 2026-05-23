import { createProject, createUser } from '../__tests__/helpers/factories.ts';
import { db } from '../database/index.ts';
import { ValidationError } from '../graphql/errors.ts';
import { logger } from '../logger/index.ts';
import { expandTaskReachability } from '../modules/task/internal/TaskQueries.ts';
import { TaskServiceImpl } from '../modules/task/internal/TaskServiceImpl.ts';

/**
 * Phase 2 Verification Script: Pre-Action Guards.
 * This script verifies that behavior rules correctly block unauthorized task mutations.
 */
async function run() {
    logger.info('Starting Phase 2 Verification...');

    const user = await createUser();
    const project = await createProject(user.id);
    const taskService = new TaskServiceImpl();

    // 1. Setup Tasks for PARENT_DELETE_GUARD
    const parentTask = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Parent Task',
    });

    const subtask = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Subtask',
    });

    // Manually expand reachability since we are testing in-process without Kafka consumers running.
    await db.transaction().execute(async (trx) => {
        await expandTaskReachability(
            trx as any,
            project.id,
            parentTask.id,
            subtask.id,
        );
    });

    // 2. Test PARENT_DELETE_GUARD
    logger.info('Testing PARENT_DELETE_GUARD...');
    await db
        .insertInto('behavior_rule')
        .values({
            fk_project_id: project.id as any,
            name: 'Block parent delete',
            behavior_type: 'PARENT_DELETE_GUARD',
            action_message: 'Cannot delete task with active subtasks',
        })
        .execute();

    try {
        await taskService.deleteTask({
            actorId: user.id,
            projectId: project.id,
            taskId: parentTask.id,
        });
        throw new Error('FAILED: Should have blocked parent deletion');
    } catch (e) {
        if (
            e instanceof ValidationError &&
            e.message === 'Cannot delete task with active subtasks'
        ) {
            logger.info(
                'PASSED: PARENT_DELETE_GUARD blocked deletion correctly',
            );
        } else {
            logger.error(
                'Unexpected error type or message for PARENT_DELETE_GUARD',
                e,
            );
            throw e;
        }
    }

    // 3. Test BLOCKER_SAFETY_GUARD
    logger.info('Testing BLOCKER_SAFETY_GUARD...');
    const blockedTask = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Blocked Task',
    });

    const blocker = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Blocker',
    });

    // Blocker links are checked via task_link table which is updated synchronously.
    await taskService.createTaskLink({
        actorId: user.id,
        projectId: project.id,
        sourceTaskId: blocker.id,
        targetTaskId: blockedTask.id,
        label: 'blocks',
    });

    await db
        .insertInto('behavior_rule')
        .values({
            fk_project_id: project.id as any,
            name: 'Blocker safety',
            behavior_type: 'BLOCKER_SAFETY_GUARD',
            action_message: 'Cannot start task with incomplete blockers',
        })
        .execute();

    try {
        // Fetch fresh task to get correct version
        const freshBlockedTask = (
            await taskService.getTasksByIds([blockedTask.id])
        )[0]!;
        await taskService.updateTask({
            actorId: freshBlockedTask.createdBy, // Use creator as actor
            projectId: freshBlockedTask.projectId,
            taskId: freshBlockedTask.id,
            version: freshBlockedTask.version,
            status: 'IN_PROGRESS',
        });
        throw new Error('FAILED: Should have blocked status update');
    } catch (e) {
        if (
            e instanceof ValidationError &&
            e.message === 'Cannot start task with incomplete blockers'
        ) {
            logger.info(
                'PASSED: BLOCKER_SAFETY_GUARD blocked status update correctly',
            );
        } else {
            logger.error(
                'Unexpected error type or message for BLOCKER_SAFETY_GUARD',
                e,
            );
            throw e;
        }
    }

    // 4. Test MEMBER_ASSIGNMENT_GUARD
    logger.info('Testing MEMBER_ASSIGNMENT_GUARD...');
    const unassignedTask = await taskService.createTask({
        actorId: user.id,
        projectId: project.id,
        title: 'Unassigned Task',
    });

    await db
        .insertInto('behavior_rule')
        .values({
            fk_project_id: project.id as any,
            name: 'Member assignment',
            behavior_type: 'MEMBER_ASSIGNMENT_GUARD',
            action_message: 'Cannot assign member without a team',
        })
        .execute();

    try {
        await taskService.updateTask({
            actorId: user.id,
            projectId: project.id,
            taskId: unassignedTask.id,
            version: unassignedTask.version,
            memberId: user.id,
        });
        throw new Error('FAILED: Should have blocked member assignment');
    } catch (e) {
        if (
            e instanceof ValidationError &&
            e.message === 'Cannot assign member without a team'
        ) {
            logger.info(
                'PASSED: MEMBER_ASSIGNMENT_GUARD blocked assignment correctly',
            );
        } else {
            logger.error(
                'Unexpected error type or message for MEMBER_ASSIGNMENT_GUARD',
                e,
            );
            throw e;
        }
    }

    logger.info('Phase 2 Verification PASSED');
    process.exit(0);
}

run().catch((e) => {
    logger.error('Phase 2 Verification FAILED', e);
    process.exit(1);
});
