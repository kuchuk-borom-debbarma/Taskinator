import { logger } from '../../../logger';
import type { TaskService } from '../../task/TaskService';

export type ActionHandler = (
    targetId: string,
    config: any,
    context: { traceId: string },
) => Promise<void>;

export const createActionHandlers = (
    taskService: TaskService,
): Record<string, ActionHandler> => ({
    'task.update_status': async (taskId, config, { traceId }) => {
        const status = config.status;
        logger.info(
            `[ActionHandler] Updating task ${taskId} status to ${status} (Trace: ${traceId})`,
        );

        // We need the current version for optimistic locking.
        // For now, we'll fetch the task first.
        const [task] = await taskService.getTasksByIds([taskId]);
        if (!task)
            throw new Error(
                `[ActionHandler] Task ${taskId} not found for update_status`,
            );

        await taskService.updateTask({
            actorId: 'system:autopilot',
            projectId: task.projectId,
            taskId: task.id,
            version: task.version,
            status,
        });
    },

    'task.assign_team': async (taskId, config, { traceId }) => {
        const teamId = config.teamId;
        logger.info(
            `[ActionHandler] Assigning task ${taskId} to team ${teamId} (Trace: ${traceId})`,
        );

        const [task] = await taskService.getTasksByIds([taskId]);
        if (!task) throw new Error(`[ActionHandler] Task ${taskId} not found`);

        await taskService.updateTask({
            actorId: 'system:autopilot',
            projectId: task.projectId,
            taskId: task.id,
            version: task.version,
            teamId,
        });
    },

    'task.assign_member': async (taskId, config, { traceId }) => {
        const memberId = config.memberId;
        logger.info(
            `[ActionHandler] Assigning task ${taskId} to member ${memberId} (Trace: ${traceId})`,
        );

        const [task] = await taskService.getTasksByIds([taskId]);
        if (!task) throw new Error(`[ActionHandler] Task ${taskId} not found`);

        await taskService.updateTask({
            actorId: 'system:autopilot',
            projectId: task.projectId,
            taskId: task.id,
            version: task.version,
            memberId,
        });
    },

    'task.update_priority': async (taskId, config, { traceId }) => {
        const priority = config.priority;
        logger.info(
            `[ActionHandler] Updating task ${taskId} priority to ${priority} (Trace: ${traceId})`,
        );

        const [task] = await taskService.getTasksByIds([taskId]);
        if (!task)
            throw new Error(
                `[ActionHandler] Task ${taskId} not found for update_priority`,
            );

        await taskService.updateTask({
            actorId: 'system:autopilot',
            projectId: task.projectId,
            taskId: task.id,
            version: task.version,
            priority,
        });
    },

    'task.unassign_team': async (taskId, _config, { traceId }) => {
        logger.info(
            `[ActionHandler] Unassigning team from task ${taskId} (Trace: ${traceId})`,
        );

        const [task] = await taskService.getTasksByIds([taskId]);
        if (!task)
            throw new Error(
                `[ActionHandler] Task ${taskId} not found for unassign_team`,
            );

        await taskService.updateTask({
            actorId: 'system:autopilot',
            projectId: task.projectId,
            taskId: task.id,
            version: task.version,
            teamId: null, // Setting to null unassigns team (and member via service rules)
        });
    },

    'task.unassign_member': async (taskId, _config, { traceId }) => {
        logger.info(
            `[ActionHandler] Unassigning member from task ${taskId} (Trace: ${traceId})`,
        );

        const [task] = await taskService.getTasksByIds([taskId]);
        if (!task)
            throw new Error(
                `[ActionHandler] Task ${taskId} not found for unassign_member`,
            );

        await taskService.updateTask({
            actorId: 'system:autopilot',
            projectId: task.projectId,
            taskId: task.id,
            version: task.version,
            memberId: null,
        });
    },
});
