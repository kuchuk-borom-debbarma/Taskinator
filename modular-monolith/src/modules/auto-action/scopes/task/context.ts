import { taskService } from '../../../task/index.js';
import type { ContextResolver } from '../../contextEngine.js';
import type { TaskContext } from './types.js';
import { taskContextSchema } from './types.js';

export const taskContextResolver: ContextResolver<TaskContext> = {
    scope: 'TASK',
    schema: taskContextSchema,
    async resolve(
        entityId: string,
        actorId: string,
        traceId: string,
        wasSnapshot?: Record<string, any>,
    ): Promise<TaskContext> {
        // Fetch the fresh task data via taskService — including persisted prev_ columns
        const task = await taskService.getTaskContextById(entityId);

        if (!task) {
            throw new Error(
                `[TaskContextResolver] Task with ID "${entityId}" not found.`,
            );
        }

        // wasSnapshot is only used as a fallback for the initial trigger call,
        // before any update has written prev_ values into the database.
        const was = wasSnapshot || {};

        return {
            traceId,
            scope: 'TASK',
            actorId,
            taskId: entityId,
            projectId: task.fk_project_id,

            // Previous state: DB is the primary source of truth.
            // wasSnapshot is the fallback for the first-ever trigger execution
            // before the first update has persisted the prev_ columns.
            prev_status:
                task.prev_status !== null
                    ? task.prev_status
                    : was.status !== undefined
                      ? was.status
                      : was.prev_status !== undefined
                        ? was.prev_status
                        : null,
            prev_priority:
                task.prev_priority !== null
                    ? task.prev_priority
                    : was.priority !== undefined
                      ? was.priority
                      : was.prev_priority !== undefined
                        ? was.prev_priority
                        : null,
            prev_title:
                task.prev_title !== null
                    ? task.prev_title
                    : was.title !== undefined
                      ? was.title
                      : was.prev_title !== undefined
                        ? was.prev_title
                        : null,
            prev_team_id:
                task.prev_team_id !== null
                    ? task.prev_team_id
                    : was.fk_team_id !== undefined
                      ? was.fk_team_id
                      : was.teamId !== undefined
                        ? was.teamId
                        : was.prev_team_id !== undefined
                          ? was.prev_team_id
                          : null,
            prev_member_id:
                task.prev_member_id !== null
                    ? task.prev_member_id
                    : was.fk_member_id !== undefined
                      ? was.fk_member_id
                      : was.memberId !== undefined
                        ? was.memberId
                        : was.prev_member_id !== undefined
                          ? was.prev_member_id
                          : null,
            // version has no dedicated prev_ column — wasSnapshot only
            prev_version:
                was.version !== undefined
                    ? was.version
                    : was.prev_version !== undefined
                      ? was.prev_version
                      : null,

            // Current state mapping
            current_status: task.status ?? null,
            current_priority: task.priority ?? null,
            current_title: task.title ?? null,
            current_team_id: task.fk_team_id ?? null,
            current_member_id: task.fk_member_id ?? null,
            current_version: task.version ?? null,
        };
    },
};
