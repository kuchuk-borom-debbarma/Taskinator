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
            WHERE id = ${data.parentTaskId ?? null}::uuid
              AND fk_project_id = ${data.projectId}::uuid
        ),
        auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            LIMIT 1
        ),
        inserted_task AS (
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
            SELECT ${data.projectId}::uuid,
                   ${data.teamId ?? null}::uuid,
                   ${data.memberId ?? null},
                   ${data.parentTaskId ?? null}::uuid,
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
              -- Rule: Team must belong to the project
              AND (${data.teamId ?? null}::text IS NULL OR EXISTS (SELECT 1 FROM project_team WHERE id = ${data.teamId}::uuid AND fk_project_id = ${data.projectId}::uuid))
              -- Rule: Member must be part of the project (either owner or member)
              AND (${data.memberId ?? null}::text IS NULL OR (
                    EXISTS (SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.memberId})
                    OR
                    EXISTS (SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.memberId})
              ))
              -- Rule: If team is provided, member must belong to that team
              AND (${data.memberId ?? null}::text IS NULL OR ${data.teamId ?? null}::text IS NULL OR EXISTS (SELECT 1 FROM project_team_member WHERE fk_user_id = ${data.memberId} AND fk_team_id = ${data.teamId}::uuid AND fk_project_id = ${data.projectId}::uuid))
              -- Rule: Parent task must belong to the project
              AND (${data.parentTaskId ?? null}::text IS NULL OR EXISTS (SELECT 1 FROM parent_info))
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.task.created',
                   id::text,
                   jsonb_build_object(
                       'taskId', id,
                       'projectId', fk_project_id,
                       'userId', created_by,
                       'title', title
                   )
            FROM inserted_task
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
        FROM inserted_task
    `.execute(db);

    if (result.rows.length === 0)
        throw new Error(
            'Unauthorized or invalid parameters (member not in project/team)',
        );

    return result.rows[0]!;
};

export const deleteTasks = async (
    data: DeleteTasksParam,
): Promise<ProjectTask[]> => {
    const result = await sql<ProjectTask>`
        WITH deleted_tasks AS (
            DELETE FROM project_task
            WHERE fk_project_id = ${data.projectId}::uuid
              AND id = ANY (${data.taskIds}::uuid[])
              AND (
                EXISTS (SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId})
                OR EXISTS (SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId})
                )
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.task.parent.deleted',
                   id::text,
                   jsonb_build_object(
                        'id', id,
                        'projectId', fk_project_id,
                        'teamId', fk_team_id,
                        'memberId', fk_member_id,
                        'parentTaskId', fk_parent_task_id,
                        'title', title,
                        'description', description,
                        'status', status,
                        'materializedPath', materialized_path,
                        'version', version,
                        'lastEventId', last_event_id,
                        'createdBy', created_by,
                        'updatedBy', updated_by,
                        'createdAt', created_at,
                        'updatedAt', updated_at
                   )
            FROM deleted_tasks
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
        FROM deleted_tasks
    `.execute(db);

    if (result.rows.length !== data.taskIds.length) {
        throw new Error('Unauthorized or some tasks not found');
    }

    return result.rows;
};

export const deleteChildrenTasksBatch = async (
    projectId: string,
    parentPath: string,
    limit: number,
): Promise<{ deletedIds: string[]; hasMore: boolean }> => {
    // Select children first using the path
    const childrenQuery = await sql<{ id: string }>`
        SELECT id, materialized_path
        FROM project_task
        WHERE fk_project_id = ${projectId}::uuid
          AND (materialized_path = ${parentPath} OR materialized_path LIKE ${parentPath + '/%'})
        LIMIT ${limit + 1}
    `.execute(db);

    console.log(
        `[TaskQueries] deleteChildrenTasksBatch: projectId=${projectId}, parentPath=${parentPath}, foundRows=`,
        childrenQuery.rows,
    );

    if (childrenQuery.rows.length === 0) {
        return { deletedIds: [], hasMore: false };
    }

    const hasMore = childrenQuery.rows.length > limit;
    const targetIds = childrenQuery.rows.slice(0, limit).map((r) => r.id);

    // Delete the targeted batch
    const result = await sql<{ id: string }>`
        DELETE
        FROM project_task
        WHERE fk_project_id = ${projectId}::uuid
          AND id = ANY (${targetIds}::uuid[])
        RETURNING id
    `.execute(db);

    return {
        deletedIds: result.rows.map((r) => r.id),
        hasMore,
    };
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
            SELECT materialized_path, version, fk_team_id
            FROM project_task
            WHERE id = ${data.taskId}::uuid AND fk_project_id = ${data.projectId}::uuid
        ),
        parent_info AS (
            SELECT materialized_path, id
            FROM project_task
            WHERE id = ${data.parentTaskId ?? null}::uuid AND fk_project_id = ${data.projectId}::uuid
        ),
        auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
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
                fk_team_id = CASE WHEN ${data.teamId !== undefined} THEN ${data.teamId}::uuid ELSE fk_team_id END,
                fk_member_id = CASE WHEN ${data.memberId !== undefined} THEN ${data.memberId} ELSE fk_member_id END,
                fk_parent_task_id = CASE WHEN ${data.parentTaskId !== undefined} THEN ${data.parentTaskId}::uuid ELSE fk_parent_task_id END,
                materialized_path = (SELECT new_path FROM path_calculation),
                last_event_id = ${data.lastEventId ?? null}::uuid,
                version = version + 1,
                updated_by = ${data.userId},
                updated_at = ${getTimeString()}
            WHERE id = ${data.taskId}::uuid
              AND fk_project_id = ${data.projectId}::uuid
              AND version = ${data.version}
              AND EXISTS (SELECT 1 FROM auth_check)
              -- Validation Rules
              AND (${data.teamId === undefined} OR ${data.teamId === null} OR EXISTS (SELECT 1 FROM project_team WHERE id = ${data.teamId}::uuid AND fk_project_id = ${data.projectId}::uuid))
              -- Member must be part of the project
              AND (${data.memberId === undefined} OR ${data.memberId === null} OR (
                    EXISTS (SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.memberId})
                    OR
                    EXISTS (SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.memberId})
              ))
              -- If team is provided (or current team is used), member must belong to that team
              AND (${data.memberId === undefined} OR ${data.memberId === null} OR EXISTS (
                  SELECT 1 FROM project_team_member 
                  WHERE fk_user_id = ${data.memberId} 
                    AND fk_project_id = ${data.projectId}::uuid 
                    AND fk_team_id = COALESCE(${data.teamId ?? undefined}::uuid, (SELECT fk_team_id FROM current_task))
              ))
              AND (${data.parentTaskId === undefined} OR ${data.parentTaskId === null} OR EXISTS (SELECT 1 FROM parent_info))
            RETURNING id
        ),
        updated_descendants AS (
            UPDATE project_task
            SET materialized_path = (SELECT new_path FROM path_calculation) ||
                                    CASE WHEN (SELECT new_path FROM path_calculation) = '' THEN '' ELSE '/' END ||
                                    ${data.taskId}::text ||
                                    SUBSTR(materialized_path, LENGTH((SELECT old_path FROM path_calculation) || CASE WHEN (SELECT old_path FROM path_calculation) = '' THEN '' ELSE '/' END || ${data.taskId}::text) + 1)
            WHERE ${data.parentTaskId !== undefined}
              AND EXISTS (SELECT 1 FROM updated_task)
              AND materialized_path LIKE (SELECT old_path FROM path_calculation) || CASE WHEN (SELECT old_path FROM path_calculation) = '' THEN '' ELSE '/' END || ${data.taskId}::text || '/%'
            RETURNING id
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.task.updated',
                   id::text,
                   jsonb_build_object(
                       'taskId', id,
                       'projectId', ${data.projectId}::text,
                       'userId', ${data.userId}::text,
                       'updates', ${JSON.stringify(data)}::jsonb
                   )
            FROM updated_task
        )
        SELECT id FROM updated_task
    `.execute(db);

    return result.rows[0]?.id ?? null;
};

export const deleteAllProjectTasks = async (projectId: string) => {
    await db
        .deleteFrom('project_task')
        .where('fk_project_id', '=', sql`${projectId}::uuid` as any)
        .execute();
};

export const unassignMemberFromAllTasks = async (
    projectId: string,
    memberId: string,
) => {
    await db
        .updateTable('project_task')
        .set({ fk_member_id: null })
        .where('fk_project_id', '=', sql`${projectId}::uuid` as any)
        .where('fk_member_id', '=', memberId)
        .execute();
};

export const unassignTeamFromAllTasks = async (
    projectId: string,
    teamId: string,
) => {
    await db
        .updateTable('project_task')
        .set({
            fk_team_id: null,
            fk_member_id: null,
        })
        .where('fk_project_id', '=', sql`${projectId}::uuid` as any)
        .where('fk_team_id', '=', sql`${teamId}::uuid` as any)
        .execute();
};

export const unassignMemberFromTeamTasks = async (
    projectId: string,
    teamId: string,
    memberId: string,
) => {
    await db
        .updateTable('project_task')
        .set({ fk_member_id: null })
        .where('fk_project_id', '=', sql`${projectId}::uuid` as any)
        .where('fk_team_id', '=', sql`${teamId}::uuid` as any)
        .where('fk_member_id', '=', memberId)
        .execute();
};

export const getTasks = async (
    userId: string,
    projectId: string,
): Promise<ProjectTask[]> => {
    const result = await sql<ProjectTask>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}
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
        WHERE fk_project_id = ${projectId}::uuid
          AND EXISTS (SELECT 1 FROM auth_check)
        ORDER BY created_at ASC
    `.execute(db);
    return result.rows;
};
