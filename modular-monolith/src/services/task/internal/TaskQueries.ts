import type {
    CreateTaskParam,
    DeleteTasksParam,
    ProjectTask,
} from '../TaskService.ts';
import { sql } from 'kysely';
import { db } from '../../../database';
import { getTimeString } from '../../../utils/utils.ts';

export const insertTask = async (
    data: CreateTaskParam,
): Promise<ProjectTask> => {
    const result = await sql<ProjectTask>`
        WITH parent_info AS (
            SELECT materialized_path, id
            FROM project_task
            WHERE id = ${data.parentTaskId ?? null}
              AND fk_project_id = ${data.projectId}
        ),
        auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId} AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId} AND fk_user_id = ${data.userId}
            LIMIT 1
        )
        INSERT INTO project_task (fk_project_id,
                                  fk_team_id,
                                  fk_member_id,
                                  fk_parent_task_id,
                                  title,
                                  description,
                                  status,
                                  materialized_path,
                                  created_by,
                                  updated_by,
                                  created_at)
        SELECT ${data.projectId},
               ${data.teamId ?? null},
               ${data.memberId ?? null},
               ${data.parentTaskId ?? null},
               ${data.title},
               ${data.description},
               ${data.initialStatus},
               CASE
                   WHEN ${data.parentTaskId ?? null}::text IS NOT NULL THEN
                       (SELECT CASE
                                   WHEN materialized_path = '' THEN id::text
                                   ELSE materialized_path || '/' || id::text
                               END FROM parent_info)
                   ELSE ''
               END,
               ${data.userId},
               ${data.userId},
               ${getTimeString()}
        WHERE EXISTS (SELECT 1 FROM auth_check)
          -- Rule 2 & 3 & 4 combined into one optimized EXISTS check if possible, or kept surgical
          AND (${data.teamId ?? null}::text IS NULL OR EXISTS (SELECT 1 FROM project_team WHERE id = ${data.teamId} AND fk_project_id = ${data.projectId}))
          AND (${data.memberId ?? null}::text IS NULL OR EXISTS (SELECT 1 FROM project_team_member WHERE fk_user_id = ${data.memberId} AND fk_team_id = ${data.teamId} AND fk_project_id = ${data.projectId}))
          AND (${data.parentTaskId ?? null}::text IS NULL OR EXISTS (SELECT 1 FROM parent_info))
        RETURNING
            id,
            fk_project_id AS "projectId",
            fk_team_id AS "teamId",
            fk_member_id AS "memberId",
            fk_parent_task_id AS "parentTaskId",
            title,
            description,
            status,
            materialized_path AS "materializedPath",
            version,
            last_event_id AS "lastEventId",
            created_by AS "createdBy",
            updated_by AS "updatedBy",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
    `.execute(db);

    if (result.rows.length === 0)
        throw new Error('Unauthorized or invalid parameters');

    return result.rows[0]!;
};

export const deleteTasks = async (
    data: DeleteTasksParam,
): Promise<string[]> => {
    const result = await sql<{ id: string }>`
        DELETE
        FROM project_task
        WHERE fk_project_id = ${data.projectId}
          AND id = ANY (${data.taskIds}::text[])
          AND (
            EXISTS (SELECT 1 FROM project WHERE id = ${data.projectId} AND fk_user_id = ${data.userId})
            OR EXISTS (SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId} AND fk_user_id = ${data.userId})
            )
            RETURNING id
    `.execute(db);

    if (result.rows.length !== data.taskIds.length) {
        throw new Error('Unauthorized or some tasks not found');
    }

    return result.rows.map((r) => r.id);
};

export interface UpdateTaskParam {
    userId: string;
    projectId: string;
    taskId: string;
    version: number;
    lastEventId?: string;
    status?: string;
    teamId?: string;
    memberId?: string;
    parentTaskId?: string;
}

export const updateTask = async (
    data: UpdateTaskParam,
): Promise<string | null> => {
    // Optimized for 10k RPS: Consolidating subqueries into one WITH block
    const result = await sql<{ id: string }>`
        WITH current_task AS (
            SELECT materialized_path, version
            FROM project_task
            WHERE id = ${data.taskId} AND fk_project_id = ${data.projectId}
        ),
        parent_info AS (
            SELECT materialized_path, id
            FROM project_task
            WHERE id = ${data.parentTaskId ?? null} AND fk_project_id = ${data.projectId}
        ),
        auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId} AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId} AND fk_user_id = ${data.userId}
            LIMIT 1
        ),
        path_calculation AS (
            SELECT 
                CASE 
                    WHEN ${data.parentTaskId === undefined} THEN (SELECT materialized_path FROM current_task)
                    WHEN ${data.parentTaskId === null} THEN ''
                    ELSE (SELECT CASE WHEN materialized_path = '' THEN id::text ELSE materialized_path || '/' || id::text END FROM parent_info)
                END as new_path,
                (SELECT materialized_path FROM current_task) as old_path
        ),
        updated_task AS (
            UPDATE project_task
            SET status = CASE WHEN ${data.status !== undefined} THEN ${data.status} ELSE status END,
                fk_team_id = CASE WHEN ${data.teamId !== undefined} THEN ${data.teamId} ELSE fk_team_id END,
                fk_member_id = CASE WHEN ${data.memberId !== undefined} THEN ${data.memberId} ELSE fk_member_id END,
                fk_parent_task_id = CASE WHEN ${data.parentTaskId !== undefined} THEN ${data.parentTaskId} ELSE fk_parent_task_id END,
                materialized_path = (SELECT new_path FROM path_calculation),
                last_event_id = ${data.lastEventId ?? null},
                version = version + 1,
                updated_by = ${data.userId},
                updated_at = ${getTimeString()}
            WHERE id = ${data.taskId}
              AND fk_project_id = ${data.projectId}
              AND version = ${data.version}
              AND EXISTS (SELECT 1 FROM auth_check)
              -- Validation Rules
              AND (${data.teamId === undefined} OR ${data.teamId === null} OR EXISTS (SELECT 1 FROM project_team WHERE id = ${data.teamId} AND fk_project_id = ${data.projectId}))
              AND (${data.memberId === undefined} OR ${data.memberId === null} OR EXISTS (SELECT 1 FROM project_team_member WHERE fk_user_id = ${data.memberId} AND fk_project_id = ${data.projectId} AND fk_team_id = COALESCE(${data.teamId ?? null}, (SELECT fk_team_id FROM project_task WHERE id = ${data.taskId}))))
              AND (${data.parentTaskId === undefined} OR ${data.parentTaskId === null} OR EXISTS (SELECT 1 FROM parent_info))
            RETURNING id
        ),
        updated_descendants AS (
            UPDATE project_task
            SET materialized_path = (SELECT new_path FROM path_calculation) ||
                                    CASE WHEN (SELECT new_path FROM path_calculation) = '' THEN '' ELSE '/' END ||
                                    ${data.taskId} ||
                                    SUBSTR(materialized_path, LENGTH((SELECT old_path FROM path_calculation) || CASE WHEN (SELECT old_path FROM path_calculation) = '' THEN '' ELSE '/' END || ${data.taskId}) + 1)
            WHERE ${data.parentTaskId !== undefined}
              AND EXISTS (SELECT 1 FROM updated_task)
              AND materialized_path LIKE (SELECT old_path FROM path_calculation) || CASE WHEN (SELECT old_path FROM path_calculation) = '' THEN '' ELSE '/' END || ${data.taskId} || '/%'
            RETURNING id
        )
        SELECT id FROM updated_task
    `.execute(db);

    return result.rows[0]?.id ?? null;
};

export const deleteAllProjectTasks = async (projectId: string) => {
    await db
        .deleteFrom('projectTask')
        .where('fk_project_id', '=', projectId)
        .execute();
};

export const unassignMemberFromAllTasks = async (
    projectId: string,
    memberId: string,
) => {
    await db
        .updateTable('projectTask')
        .set({ fk_member_id: null })
        .where('fk_project_id', '=', projectId)
        .where('fk_member_id', '=', memberId)
        .execute();
};

export const unassignTeamFromAllTasks = async (
    projectId: string,
    teamId: string,
) => {
    await db
        .updateTable('projectTask')
        .set({
            fk_team_id: null,
            fk_member_id: null,
        })
        .where('fk_project_id', '=', projectId)
        .where('fk_team_id', '=', teamId)
        .execute();
};

export const unassignMemberFromTeamTasks = async (
    projectId: string,
    teamId: string,
    memberId: string,
) => {
    await db
        .updateTable('projectTask')
        .set({ fk_member_id: null })
        .where('fk_project_id', '=', projectId)
        .where('fk_team_id', '=', teamId)
        .where('fk_member_id', '=', memberId)
        .execute();
};

export const getTasks = async (
    userId: string,
    projectId: string,
): Promise<ProjectTask[]> => {
    const result = await sql<ProjectTask>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId} AND fk_user_id = ${userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId} AND fk_user_id = ${userId}
            LIMIT 1
        )
        SELECT 
            id,
            fk_project_id AS "projectId",
            fk_team_id AS "teamId",
            fk_member_id AS "memberId",
            fk_parent_task_id AS "parentTaskId",
            title,
            description,
            status,
            materialized_path AS "materializedPath",
            version,
            last_event_id AS "lastEventId",
            created_by AS "createdBy",
            updated_by AS "updatedBy",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        FROM project_task
        WHERE fk_project_id = ${projectId}
          AND EXISTS (SELECT 1 FROM auth_check)
        ORDER BY created_at ASC
    `.execute(db);
    return result.rows;
};
