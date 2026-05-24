import { db } from '../../../infra/database/index.ts';
import { taskService } from '../index.ts';

export class CascadeService {
    async resolveBlockers(param: {
        actorId: string;
        traceId?: string;
        taskId: string;
        targetStatus: string;
    }) {
        const { actorId, traceId, taskId, targetStatus } = param;

        // Find direct successors of this task linked with 'blocks'
        const successors = await db
            .selectFrom('task_link')
            .select('target_task_id')
            .where('source_task_id', '=', taskId)
            .where('label', '=', 'blocks')
            .execute();

        for (const { target_task_id } of successors) {
            // Check if there are any other incomplete blockers (not complete / done) for this successor task
            const incompleteBlockers = await db
                .selectFrom('task_link')
                .innerJoin(
                    'project_task',
                    'project_task.id',
                    'task_link.source_task_id',
                )
                .select('project_task.id')
                .where('task_link.target_task_id', '=', target_task_id)
                .where('task_link.label', '=', 'blocks')
                .where('task_link.source_task_id', '!=', taskId)
                .where('project_task.status', '!=', 'DONE')
                .execute();

            if (incompleteBlockers.length === 0) {
                // All blockers are resolved! Auto-resolve successor status
                const successorTask =
                    await taskService.getTaskContextById(target_task_id);
                if (successorTask && successorTask.status === 'BLOCKED') {
                    await taskService.updateTask({
                        actorId,
                        projectId: successorTask.fk_project_id,
                        taskId: target_task_id,
                        version: successorTask.version,
                        status: targetStatus,
                        traceId,
                    });
                }
            }
        }
    }

    async cascadePriority(param: {
        actorId: string;
        traceId?: string;
        taskId: string;
        priority: number;
    }) {
        const { actorId, traceId, taskId, priority } = param;

        const subtasks = await db
            .selectFrom('task_reachability')
            .select('descendant_task_id')
            .where('ancestor_task_id', '=', taskId)
            .where('depth', '>', 0)
            .execute();

        for (const { descendant_task_id } of subtasks) {
            const subtask =
                await taskService.getTaskContextById(descendant_task_id);
            if (subtask && subtask.priority !== priority) {
                await taskService.updateTask({
                    actorId,
                    projectId: subtask.fk_project_id,
                    taskId: descendant_task_id,
                    version: subtask.version,
                    priority,
                    traceId,
                });
            }
        }
    }

    async cascadeTeam(param: {
        actorId: string;
        traceId?: string;
        taskId: string;
        teamId: string | null;
    }) {
        const { actorId, traceId, taskId, teamId } = param;

        const subtasks = await db
            .selectFrom('task_reachability')
            .select('descendant_task_id')
            .where('ancestor_task_id', '=', taskId)
            .where('depth', '>', 0)
            .execute();

        for (const { descendant_task_id } of subtasks) {
            const subtask =
                await taskService.getTaskContextById(descendant_task_id);
            if (subtask && subtask.fk_team_id !== teamId) {
                await taskService.updateTask({
                    actorId,
                    projectId: subtask.fk_project_id,
                    taskId: descendant_task_id,
                    version: subtask.version,
                    teamId,
                    traceId,
                });
            }
        }
    }

    async cascadeDelete(param: {
        actorId: string;
        traceId?: string;
        taskId: string;
    }) {
        const { actorId, taskId } = param;

        // Fetch task to get its project ID
        const task = await taskService.getTaskContextById(taskId);
        if (!task) return;

        const subtasks = await db
            .selectFrom('task_reachability')
            .select('descendant_task_id')
            .where('ancestor_task_id', '=', taskId)
            .where('depth', '>', 0)
            .execute();

        for (const { descendant_task_id } of subtasks) {
            const subtask =
                await taskService.getTaskContextById(descendant_task_id);
            if (subtask) {
                await taskService.deleteTask({
                    actorId,
                    projectId: subtask.fk_project_id,
                    taskId: descendant_task_id,
                });
            }
        }
    }
}

export const cascadeService = new CascadeService();
