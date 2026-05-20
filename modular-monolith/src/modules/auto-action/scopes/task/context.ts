import { db } from '../../../../database/index.js';
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
        // Fetch the fresh task data from the database
        const task = await db
            .selectFrom('project_task')
            .select([
                'id',
                'fk_project_id',
                'fk_team_id',
                'fk_member_id',
                'title',
                'status',
                'priority',
                'version',
            ])
            .where('id', '=', entityId as any)
            .executeTakeFirst();

        if (!task) {
            throw new Error(
                `[TaskContextResolver] Task with ID "${entityId}" not found.`,
            );
        }

        const was = wasSnapshot || {};

        return {
            traceId,
            scope: 'TASK',
            actorId,
            taskId: entityId,
            projectId: task.fk_project_id,

            // Previous state mapping (wasSnapshot support with fallbacks)
            prev_status:
                was.status !== undefined
                    ? was.status
                    : was.prev_status !== undefined
                      ? was.prev_status
                      : null,
            prev_priority:
                was.priority !== undefined
                    ? was.priority
                    : was.prev_priority !== undefined
                      ? was.prev_priority
                      : null,
            prev_title:
                was.title !== undefined
                    ? was.title
                    : was.prev_title !== undefined
                      ? was.prev_title
                      : null,
            prev_team_id:
                was.fk_team_id !== undefined
                    ? was.fk_team_id
                    : was.teamId !== undefined
                      ? was.teamId
                      : was.prev_team_id !== undefined
                        ? was.prev_team_id
                        : null,
            prev_member_id:
                was.fk_member_id !== undefined
                    ? was.fk_member_id
                    : was.memberId !== undefined
                      ? was.memberId
                      : was.prev_member_id !== undefined
                        ? was.prev_member_id
                        : null,
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
