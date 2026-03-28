import type {
    CreateTaskParam,
    DeleteTasksParam,
    ProjectTask,
} from "../TaskService.ts";
import {sql} from "kysely";
import {db} from "../../../database";
import {getTimeString} from "../../../utils/utils.ts";

export const insertTask = async (data: CreateTaskParam): Promise<ProjectTask> => {
    const result = await sql<ProjectTask>`
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
                                       WHEN materialized_path = '' THEN ${data.parentTaskId}
                                       ELSE materialized_path || '/' || ${data.parentTaskId}
                                       END
                            FROM project_task
                            WHERE id = ${data.parentTaskId})
                   ELSE ''
                   END,
               ${data.userId},
               ${data.userId},
               ${getTimeString()}
        WHERE 
            -- Rule 1: Auth check (Project Owner or Project Member)
            (
                EXISTS (SELECT 1 FROM project WHERE id = ${data.projectId} AND fk_user_id = ${data.userId})
                OR EXISTS (SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId} AND fk_user_id = ${data.userId})
            )
            -- Rule 2: teamId validation (if provided)
            AND (
                ${data.teamId ?? null}::text IS NULL 
                OR EXISTS (SELECT 1 FROM project_team WHERE id = ${data.teamId} AND fk_project_id = ${data.projectId})
            )
            -- Rule 3: memberId validation (if provided)
            AND (
                ${data.memberId ?? null}::text IS NULL 
                OR EXISTS (SELECT 1 FROM project_team_member WHERE fk_user_id = ${data.memberId} AND fk_team_id = ${data.teamId} AND fk_project_id = ${data.projectId})
            )
            -- Rule 4: parentTaskId validation (if provided)
            AND (
                ${data.parentTaskId ?? null}::text IS NULL 
                OR EXISTS (SELECT 1 FROM project_task WHERE id = ${data.parentTaskId} AND fk_project_id = ${data.projectId})
            )
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
            created_by AS "createdBy",
            updated_by AS "updatedBy",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
    `.execute(db);

    if (result.rows.length === 0)
        throw new Error('Unauthorized or invalid parameters');

    return result.rows[0]!;
};

export const deleteTasks = async (data: DeleteTasksParam): Promise<string[]> => {
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
    status?: string;
    teamId?: string;
    memberId?: string;
    parentTaskId?: string;
}

export const updateTask = async (data: UpdateTaskParam): Promise<string | null> => {
    // 1. If parentTaskId is not being updated, we can do a simple update.
    // 2. If parentTaskId IS being updated, we need to:
    //    a. Calculate new path for the task.
    //    b. Update the task.
    //    c. Update all descendants paths by replacing the old path prefix with the new path prefix.

    const result = await sql<{ id: string }>`
        WITH new_path_calculation AS (
            SELECT CASE
                       WHEN ${data.parentTaskId === undefined} THEN (SELECT materialized_path FROM project_task WHERE id = ${data.taskId})
                       WHEN ${data.parentTaskId === null} THEN ''
                       ELSE (SELECT CASE
                                        WHEN materialized_path = '' THEN ${data.parentTaskId}
                                        ELSE materialized_path || '/' || ${data.parentTaskId}
                                        END
                             FROM project_task
                             WHERE id = ${data.parentTaskId})
                       END as new_path,
                   (SELECT materialized_path FROM project_task WHERE id = ${data.taskId}) as old_path
        ),
             updated_task AS (
                 UPDATE project_task
                     SET status = CASE WHEN ${data.status !== undefined} THEN ${data.status} ELSE status END,
                         fk_team_id = CASE WHEN ${data.teamId !== undefined} THEN ${data.teamId} ELSE fk_team_id END,
                         fk_member_id = CASE WHEN ${data.memberId !== undefined} THEN ${data.memberId} ELSE fk_member_id END,
                         fk_parent_task_id = CASE
                                                 WHEN ${data.parentTaskId !== undefined} THEN ${data.parentTaskId}
                                                 ELSE fk_parent_task_id END,
                         materialized_path = (SELECT new_path FROM new_path_calculation),
                         updated_by = ${data.userId},
                         updated_at = ${getTimeString()}
                     WHERE id = ${data.taskId}
                         AND fk_project_id = ${data.projectId}
                         -- Rule 1: Auth check (Project Owner or Project Member)
                         AND (
                             EXISTS (SELECT 1 FROM project WHERE id = ${data.projectId} AND fk_user_id = ${data.userId})
                             OR EXISTS (SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId} AND fk_user_id = ${data.userId})
                         )
                         -- Rule 2: teamId validation (if updated)
                         AND (
                             ${data.teamId === undefined}
                                 OR ${data.teamId === null}
                                 OR EXISTS (SELECT 1 FROM project_team WHERE id = ${data.teamId} AND fk_project_id = ${data.projectId})
                         )
                         -- Rule 3: memberId validation (if updated)
                         AND (
                             ${data.memberId === undefined}
                                 OR ${data.memberId === null}
                                 OR EXISTS (SELECT 1
                                            FROM project_team_member
                                            WHERE fk_user_id = ${data.memberId}
                                              AND fk_project_id = ${data.projectId}
                                              AND fk_team_id = COALESCE(${data.teamId ?? null}, project_task.fk_team_id))
                         )
                         -- Rule 4: parentTaskId validation (if updated)
                         AND (
                             ${data.parentTaskId === undefined}
                                 OR ${data.parentTaskId === null}
                                 OR EXISTS (SELECT 1 FROM project_task WHERE id = ${data.parentTaskId} AND fk_project_id = ${data.projectId})
                         )
                     RETURNING id
             ),
             updated_descendants AS (
                 UPDATE project_task
                     SET materialized_path = (SELECT new_path FROM new_path_calculation) ||
                                             CASE WHEN (SELECT new_path FROM new_path_calculation) = '' THEN '' ELSE '/' END ||
                                             ${data.taskId} ||
                                             SUBSTR(materialized_path,
                                                    LENGTH((SELECT old_path FROM new_path_calculation) ||
                                                           CASE WHEN (SELECT old_path FROM new_path_calculation) = '' THEN '' ELSE '/' END ||
                                                           ${data.taskId}) + 1)
                     WHERE ${data.parentTaskId !== undefined}
                       AND materialized_path LIKE (SELECT old_path FROM new_path_calculation) ||
                                                  CASE WHEN (SELECT old_path FROM new_path_calculation) = '' THEN '' ELSE '/' END ||
                                                  ${data.taskId} || '/%'
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

export const unassignMemberFromAllTasks = async (projectId: string, memberId: string) => {
    await db
        .updateTable('projectTask')
        .set({ fk_member_id: null })
        .where('fk_project_id', '=', projectId)
        .where('fk_member_id', '=', memberId)
        .execute();
};

export const unassignTeamFromAllTasks = async (projectId: string, teamId: string) => {
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

export const unassignMemberFromTeamTasks = async (projectId: string, teamId: string, memberId: string) => {
    await db
        .updateTable('projectTask')
        .set({ fk_member_id: null })
        .where('fk_project_id', '=', projectId)
        .where('fk_team_id', '=', teamId)
        .where('fk_member_id', '=', memberId)
        .execute();
};

