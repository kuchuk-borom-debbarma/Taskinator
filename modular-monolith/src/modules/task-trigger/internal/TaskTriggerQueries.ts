import { db } from '../../../database';
import type { TaskTrigger, TaskTriggerType } from '../TaskTriggerService.ts';
import { sql } from 'kysely';
import { getTimeString } from '../../../utils/utils.ts';

export const insertTaskTrigger = async (data: {
    userId: string;
    name: string;
    projectId: string;
    taskId: string;
    triggerType: TaskTriggerType;
    triggerData: any;
}) => {
    await sql`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            LIMIT 1
        )
        INSERT INTO project_task_trigger_table (fk_project_id, name, fk_task_id, trigger_data, trigger_type)
        SELECT 
            ${data.projectId}::uuid, 
            ${data.name}, 
            ${data.taskId}::uuid, 
            ${data.triggerData}::jsonb, 
            ${data.triggerType}
        WHERE EXISTS (SELECT 1 FROM auth_check)
    `.execute(db);
};

export const getTaskTriggersByTaskId = async (data: {
    taskId: string;
    cursor?: string;
    limit?: number;
}): Promise<{ triggers: TaskTrigger[]; nextCursor: string | null }> => {
    const { taskId } = data;
    const limit = Math.min(data.limit ?? 20, 50);
    const cursor = data.cursor;

    const result = await sql<any>`
        SELECT id, name, fk_project_id, fk_task_id, trigger_type, trigger_data, created_at, updated_at
        FROM project_task_trigger_table
        WHERE fk_task_id = ${taskId}::uuid
          AND (
              ${cursor}::uuid IS NULL
              OR id > ${cursor}::uuid
          )
        ORDER BY id
        LIMIT ${limit + 1}
    `.execute(db);

    const hasMore = result.rows.length > limit;
    const rawTriggers = hasMore ? result.rows.slice(0, limit) : result.rows;
    const triggers = rawTriggers.map((v) => ({
        id: v.id,
        name: v.name,
        projectId: v.fk_project_id,
        taskId: v.fk_task_id,
        triggerType: v.trigger_type as TaskTriggerType,
        triggerData: v.trigger_data,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
    }));
    const nextCursor = hasMore ? triggers[triggers.length - 1]!.id : null;

    return { triggers, nextCursor };
};

/**
 * Updates the status of a specific task.
 * Returns the task ID and project ID if updated.
 */
export const updateTaskStatus = async (data: {
    taskId: string;
    statusToSet: string;
}): Promise<{ id: string; projectId: string } | null> => {
    const result = await sql<{ id: string; fk_project_id: string }>`
        WITH updated_task AS (
            UPDATE project_task
            SET status = ${data.statusToSet},
                version = version + 1,
                updated_at = ${getTimeString()}
            WHERE id = ${data.taskId}::uuid
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.task.updated',
                   id::text,
                   jsonb_build_object(
                       'taskId', id,
                       'projectId', fk_project_id,
                       'userId', 'SYSTEM',
                       'updates', jsonb_build_object('status', ${data.statusToSet}::text)
                   )
            FROM updated_task
        )
        SELECT id, fk_project_id FROM updated_task
    `.execute(db);

    const row = result.rows[0];
    if (!row) return null;
    return {
        id: row.id,
        projectId: row.fk_project_id,
    };
};

/**
 * Counts ALL descendants (direct and indirect) of a task that are not in 'DONE' status.
 */
export const countIncompleteChildren = async (
    taskId: string,
): Promise<number> => {
    // We use materialized_path to find all descendants in one efficient query.
    // A descendant's path starts with 'parentPath/taskId' or is just 'taskId'.
    const result = await sql<{ count: string }>`
        WITH parent_task AS (
            SELECT id, materialized_path 
            FROM project_task 
            WHERE id = ${taskId}::uuid
        )
        SELECT count(*) as count
        FROM project_task
        WHERE status != 'DONE'
          AND (
            -- Case 1: Direct children (legacy check for safety)
            fk_parent_task_id = ${taskId}::uuid
            OR 
            -- Case 2: Deep descendants using materialized path
            materialized_path = (SELECT CASE WHEN materialized_path = '' THEN id::text ELSE materialized_path || '/' || id::text END FROM parent_task)
            OR
            materialized_path LIKE (
                SELECT CASE 
                    WHEN materialized_path = '' THEN id::text || '/%'
                    ELSE materialized_path || '/' || id::text || '/%'
                END FROM parent_task
            )
          )
    `.execute(db);
    return parseInt(result.rows[0]?.count ?? '0');
};

/**
 * Gets a task by ID.
 */
export const getTaskById = async (taskId: string) => {
    return await db
        .selectFrom('project_task')
        .selectAll()
        .where('id', '=', taskId)
        .executeTakeFirst();
};

/**
 * Returns the list of user IDs who are members of the team assigned to a given task.
 */
export const getTaskTeamMembers = async (taskId: string): Promise<string[]> => {
    const result = await sql<{ fk_user_id: string }>`
        SELECT fk_user_id
        FROM project_team_member
        WHERE fk_team_id = (
            SELECT fk_team_id
            FROM project_task
            WHERE id = ${taskId}::uuid
        )
    `.execute(db);
    return result.rows.map((r) => r.fk_user_id);
};

/**
 * Returns the list of user IDs who are members of the team assigned to the parent of a given task.
 */
export const getParentTaskTeamMembers = async (
    taskId: string,
): Promise<string[]> => {
    const result = await sql<{ fk_user_id: string }>`
        SELECT fk_user_id
        FROM project_team_member
        WHERE fk_team_id = (
            SELECT fk_team_id
            FROM project_task
            WHERE id = (
                SELECT fk_parent_task_id
                FROM project_task
                WHERE id = ${taskId}::uuid
            )
        )
    `.execute(db);
    return result.rows.map((r) => r.fk_user_id);
};

export const deleteTaskTrigger = async (data: {
    userId: string;
    triggerId: string;
}) => {
    await sql`
        WITH deleted_trigger AS (
            DELETE FROM project_task_trigger_table
            WHERE id = ${data.triggerId}::uuid
              AND EXISTS (
                SELECT 1 FROM project p
                WHERE p.id = (SELECT fk_project_id FROM project_task_trigger_table WHERE id = ${data.triggerId}::uuid)
                  AND (p.fk_user_id = ${data.userId} OR EXISTS (
                    SELECT 1 FROM project_member pm 
                    WHERE pm.fk_project_id = p.id AND pm.fk_user_id = ${data.userId}
                  ))
              )
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.task.trigger.deleted',
                   id::text,
                   jsonb_build_object(
                       'triggerId', id,
                       'taskId', fk_task_id,
                       'projectId', fk_project_id,
                       'userId', ${data.userId}
                   )
            FROM deleted_trigger
        )
        SELECT 1 FROM deleted_trigger
    `.execute(db);
};

export const deleteTaskTriggers = async (taskIds: string[]) => {
    if (!taskIds.length) return;

    await sql`
        DELETE FROM project_task_trigger_table
        WHERE fk_task_id = ANY (${taskIds}::uuid[])
    `.execute(db);
};
