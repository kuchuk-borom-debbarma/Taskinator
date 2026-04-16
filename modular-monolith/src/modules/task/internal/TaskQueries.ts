import type {
    CreateTaskParam,
    DeleteTasksParam,
    ProjectTask,
    TaskLink,
    TaskLinkMaterialized,
} from '../TaskService.ts';
import { sql } from 'kysely';
import { db } from '../../../database';
import { getTimeString } from '../../../utils/utils.ts';

const MAX_TASK_GRAPH_DEPTH = 100;

export const insertTask = async (
    data: CreateTaskParam,
): Promise<ProjectTask> => {
    const result = await sql<ProjectTask>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            LIMIT 1
        ),
        inserted_task AS (
            INSERT INTO project_task (fk_project_id,
                                      fk_team_id,
                                      fk_member_id,
                                      title,
                                      description,
                                      status,
                                      created_by,
                                      updated_by,
                                      created_at)
            SELECT ${data.projectId}::uuid,
                   ${data.teamId ?? null}::uuid,
                   ${data.memberId ?? null},
                   ${data.title ?? null},
                   ${data.description ?? null},
                   ${data.initialStatus ?? null},
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
            title,
            description,
            status,
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
            SELECT 'project.task.deleted',
                   id::text,
                   jsonb_build_object(
                        'id', id,
                        'projectId', fk_project_id,
                        'teamId', fk_team_id,
                        'memberId', fk_member_id,
                        'title', title,
                        'description', description,
                        'status', status,
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
            title,
            description,
            status,
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

export interface UpdateTaskParam {
    userId: string;
    projectId: string;
    taskId: string;
    version: number;
    lastEventId?: string;
    status?: string;
    title?: string;
    description?: string;
    teamId?: string;
    memberId?: string;
}

export const updateTask = async (
    data: UpdateTaskParam,
): Promise<string | null> => {
    // Optimized for 10k RPS: Consolidating subqueries into one WITH block
    const result = await sql<{ id: string }>`
        WITH current_task AS (
            -- Snapshot state BEFORE update for the Logic Lane
            SELECT 
                version, 
                fk_team_id,
                status,
                title,
                description,
                fk_member_id,
                updated_at,
                fk_project_id
            FROM project_task
            WHERE id = ${data.taskId}::uuid AND fk_project_id = ${data.projectId}::uuid
        ),
        auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            LIMIT 1
        ),
        updated_task AS (
            UPDATE project_task
            SET status = CASE WHEN ${data.status !== undefined} THEN ${data.status ?? null} ELSE status END,
                title = CASE WHEN ${data.title !== undefined} THEN ${data.title ?? null} ELSE title END,
                description = CASE WHEN ${data.description !== undefined} THEN ${data.description ?? null} ELSE description END,
                fk_team_id = CASE WHEN ${data.teamId !== undefined} THEN ${data.teamId ?? null}::uuid ELSE fk_team_id END,
                fk_member_id = CASE 
                                  WHEN ${data.teamId === null} THEN null
                                  WHEN ${data.memberId !== undefined} THEN ${data.memberId ?? null} 
                                  ELSE fk_member_id 
                               END,
                last_event_id = ${data.lastEventId ?? null}::uuid,
                version = version + 1,
                updated_by = ${data.userId ?? null},
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
            RETURNING id
        ),
        metadata AS (
            SELECT gen_random_uuid() AS correlation_id
        ),
        display_outbox AS (
            -- Display Lane: keeps UI fresh
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.task.updated',
                   ut.id::text,
                   jsonb_build_object(
                       'taskId', ut.id,
                       'projectId', ut."projectId",
                       'userId', ${data.userId}::text,
                       'correlationId', m.correlation_id,
                       'updates', ${JSON.stringify(data)}::jsonb
                   )
            FROM updated_task ut, metadata m
        ),
        logic_outbox AS (
            -- Logic Lane: triggers the Automation Engine
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'automation.trigger.task',
                ut.id::text,
                jsonb_build_object(
                    'taskId',        ut.id,
                    'projectId',     ut."projectId",
                    'correlationId', m.correlation_id,
                    'depth',         0,
                    'oldState', jsonb_build_object(
                         'status',      os.status,
                         'title',       os.title,
                         'description', os.description,
                         'teamId',      os.fk_team_id,
                         'memberId',    os.fk_member_id,
                         'version',     os.version,
                         'updatedAt',   os.updated_at
                    ),
                    'newState', jsonb_build_object(
                         'status',      ut.status,
                         'title',       ut.title,
                         'description', ut.description,
                         'teamId',      ut."teamId",
                         'memberId',    ut."memberId",
                         'version',     ut.version,
                         'updatedAt',   ut."updatedAt"
                    )
                )
            FROM updated_task ut
            JOIN current_task os ON true
            JOIN metadata m ON true
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
    params: { after?: string; before?: string; limit?: number } = {},
): Promise<{ tasks: ProjectTask[]; nextCursor: string | null; prevCursor: string | null }> => {
    const limit = Math.min(params.limit ?? 20, 50);
    const { after, before } = params;
    const isBackward = !!before;
    const cursor = before || after;

    let cursorDate: string | null = null;
    let cursorId: string | null = null;

    if (cursor && cursor.includes('|')) {
        const parts = cursor.split('|');
        if (parts.length === 2) {
            cursorDate = parts[0]!;
            cursorId = parts[1]!;
        }
    }

    const result = await sql<ProjectTask>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            LIMIT 1
        )
        SELECT 
            t.id,
            t.fk_project_id AS "projectId",
            t.fk_team_id AS "teamId",
            t.fk_member_id AS "memberId",
            t.title,
            t.description,
            t.status,
            t.version,
            t.last_event_id AS "lastEventId",
            t.created_by AS "createdBy",
            t.updated_by AS "updatedBy",
            t.created_at AS "createdAt",
            t.updated_at AS "updatedAt"
        FROM project_task t
        WHERE t.fk_project_id = ${projectId}::uuid
          AND EXISTS (SELECT 1 FROM auth_check)
          AND (
              ${cursorDate}::timestamptz IS NULL
              OR (
                  CASE 
                    WHEN ${isBackward} THEN (t.created_at > ${cursorDate}::timestamptz OR (t.created_at = ${cursorDate}::timestamptz AND t.id > ${cursorId}::uuid))
                    ELSE (t.created_at < ${cursorDate}::timestamptz OR (t.created_at = ${cursorDate}::timestamptz AND t.id < ${cursorId}::uuid))
                  END
              )
          )
        ORDER BY 
            t.created_at ${sql.raw(isBackward ? 'ASC' : 'DESC')}, 
            t.id ${sql.raw(isBackward ? 'ASC' : 'DESC')}
        LIMIT ${limit + 1}
    `.execute(db);

    let rows = result.rows;
    const hasMore = rows.length > limit;
    if (hasMore) {
        rows = rows.slice(0, limit);
    }
    if (isBackward) {
        rows.reverse();
    }

    const tasks = rows;
    
    // Logic for next/prev cursors based on direction and availability
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (tasks.length > 0) {
        const first = tasks[0]!;
        const last = tasks[tasks.length - 1]!;
        
        const firstDateStr = first.createdAt instanceof Date ? first.createdAt.toISOString() : first.createdAt;
        const lastDateStr = last.createdAt instanceof Date ? last.createdAt.toISOString() : last.createdAt;

        if (isBackward) {
            // We were fetching newer items (going up)
            // If we have more, then there are even newer items above us
            prevCursor = hasMore ? `${firstDateStr}|${first.id}` : null;
            // nextCursor (going down) is always available since we have the bottom of the current set
            nextCursor = `${lastDateStr}|${last.id}`;
        } else {
            // Normal forward navigation (going down)
            // If we have more, then there are older items below us
            nextCursor = hasMore ? `${lastDateStr}|${last.id}` : null;
            // If we are offset from top (after was provided), we can definitely go back up
            prevCursor = after ? `${firstDateStr}|${first.id}` : null;
        }
    }

    return { tasks, nextCursor, prevCursor };
};

export const getTasksByIdsQuery = async (
    projectId: string,
    taskIds: string[],
): Promise<ProjectTask[]> => {
    if (taskIds.length === 0) return [];
    const result = await sql<ProjectTask>`
        SELECT
            id,
            fk_project_id AS "projectId",
            fk_team_id AS "teamId",
            fk_member_id AS "memberId",
            title,
            description,
            status,
            version,
            last_event_id AS "lastEventId",
            created_by AS "createdBy",
            updated_by AS "updatedBy",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        FROM project_task
        WHERE fk_project_id = ${projectId}::uuid
          AND id = ANY(${taskIds}::uuid[])
    `.execute(db);
    return result.rows;
};

export const createTaskLinkQuery = async (data: {
    userId: string;
    projectId: string;
    sourceTaskId: string;
    targetTaskId: string;
    label: string;
}): Promise<string> => {
    const label = data.label.trim();
    if (label.length === 0) {
        throw new Error('Link label is required');
    }
    if (label.length > 50) {
        throw new Error('Link label must be 50 characters or less');
    }
    if (/[\x00-\x1F\x7F]/.test(label)) {
        throw new Error('Link label contains invalid characters');
    }
    if (data.sourceTaskId === data.targetTaskId) {
        throw new Error('Task cannot link to itself');
    }

    const check = await sql`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            LIMIT 1
        ),
        cycle_check AS (
            SELECT 1 FROM task_link_materialized
            WHERE origin_task_id = ${data.targetTaskId}::uuid 
              AND terminal_task_id = ${data.sourceTaskId}::uuid
              AND fk_project_id = ${data.projectId}::uuid
        ),
        task_check AS (
            SELECT COUNT(*)::int AS task_count
            FROM project_task
            WHERE fk_project_id = ${data.projectId}::uuid
              AND id IN (${data.sourceTaskId}::uuid, ${data.targetTaskId}::uuid)
        )
        SELECT 
            (SELECT COUNT(*) FROM auth_check) > 0 AS authorized,
            (SELECT COUNT(*) FROM cycle_check) > 0 AS has_cycle,
            (SELECT task_count FROM task_check) = 2 AS tasks_exist
    `.execute(db);

    const { authorized, has_cycle, tasks_exist } = check.rows[0] as {
        authorized: boolean;
        has_cycle: boolean;
        tasks_exist: boolean;
    };

    if (!authorized) throw new Error('Unauthorized');
    if (!tasks_exist) throw new Error('Source or target task not found');
    if (has_cycle) throw new Error('Circular dependency detected');

    const result = await sql<{ id: string }>`
        WITH inserted_link AS (
            INSERT INTO task_link (fk_project_id, source_task_id, target_task_id, label, created_by)
            VALUES (${data.projectId}::uuid, ${data.sourceTaskId}::uuid, ${data.targetTaskId}::uuid, ${label}, ${data.userId})
            RETURNING *
        ),
        outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'task.link.created',
                ${data.projectId},
                jsonb_build_object(
                    'linkId', id,
                    'projectId', ${data.projectId},
                    'sourceTaskId', source_task_id,
                    'targetTaskId', target_task_id,
                    'label', label
                )
            FROM inserted_link
        )
        SELECT id FROM inserted_link
    `.execute(db);

    return result.rows[0]!.id;
};

export const deleteTaskLinkQuery = async (data: {
    userId: string;
    projectId: string;
    linkId: string;
}): Promise<void> => {
    const result = await sql`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            LIMIT 1
        ),
        deleted_link AS (
            DELETE FROM task_link
            WHERE id = ${data.linkId}::uuid 
              AND fk_project_id = ${data.projectId}::uuid
              AND EXISTS (SELECT 1 FROM auth_check)
            RETURNING *
        )
        INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
        SELECT 
            'task.link.deleted',
            ${data.projectId},
            jsonb_build_object(
                'linkId', id,
                'projectId', fk_project_id,
                'sourceTaskId', source_task_id,
                'targetTaskId', target_task_id,
                'label', label
            )
        FROM deleted_link
    `.execute(db);
};

export const getLinksQuery = async (data: {
    userId: string;
    projectId: string;
    taskId: string;
}): Promise<{ direct: TaskLink[]; story: TaskLinkMaterialized[] }> => {
    const authCheck = await sql`
        SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
        UNION ALL
        SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
        LIMIT 1
    `.execute(db);

    if (authCheck.rows.length === 0) throw new Error('Unauthorized');

    const [direct, story] = await Promise.all([
        sql<TaskLink>`
            SELECT 
                id, 
                fk_project_id AS "projectId", 
                source_task_id AS "sourceTaskId", 
                target_task_id AS "targetTaskId", 
                label,
                created_by AS "createdBy",
                created_at AS "createdAt"
            FROM task_link
            WHERE fk_project_id = ${data.projectId}::uuid
              AND (source_task_id = ${data.taskId}::uuid OR target_task_id = ${data.taskId}::uuid)
        `.execute(db),
        sql<TaskLinkMaterialized>`
            SELECT 
                id, 
                fk_project_id AS "projectId", 
                origin_task_id AS "originTaskId", 
                terminal_task_id AS "terminalTaskId", 
                path_task_ids AS "pathTaskIds", 
                path_link_ids AS "pathLinkIds", 
                path_link_labels AS "pathLinkLabels", 
                depth, 
                created_at AS "createdAt"
            FROM task_link_materialized
            WHERE fk_project_id = ${data.projectId}::uuid
              AND (origin_task_id = ${data.taskId}::uuid OR terminal_task_id = ${data.taskId}::uuid)
        `.execute(db),
    ]);

    return {
        direct: direct.rows,
        story: story.rows,
    };
};

/**
 * Iterative Path Re-builder (The "Re-baker")
 *
 * Given a terminal task, this completely reconstructs its task_link_materialized entries
 * based on the current adjacency list (task_link).
 *
 * Rebuilds all graph paths for a project. Duplicate labels are fine because
 * path identity uses link ids, not labels.
 */
export const rebuildProjectPathsQuery = async (data: {
    projectId: string;
}): Promise<string[]> => {
    await sql`
        DELETE FROM task_link_materialized
        WHERE fk_project_id = ${data.projectId}::uuid
    `.execute(db);

    // Reconstruct every directed acyclic path. Duplicate direct links create
    // distinct paths because identity uses path_link_ids.
    const result = await sql<{ id: string }>`
        WITH RECURSIVE paths(origin_task_id, terminal_task_id, path_task_ids, path_link_ids, path_link_labels, depth) AS (
            SELECT 
                source_task_id as origin_task_id,
                target_task_id as terminal_task_id,
                ARRAY[source_task_id, target_task_id]::uuid[] as path_task_ids,
                ARRAY[id]::uuid[] as path_link_ids,
                ARRAY[label]::text[] as path_link_labels,
                1 as depth
            FROM task_link
            WHERE fk_project_id = ${data.projectId}::uuid

            UNION ALL

            SELECT
                p.origin_task_id,
                tl.target_task_id as terminal_task_id,
                p.path_task_ids || tl.target_task_id as path_task_ids,
                p.path_link_ids || tl.id as path_link_ids,
                p.path_link_labels || tl.label as path_link_labels,
                p.depth + 1
            FROM task_link tl
            JOIN paths p ON tl.source_task_id = p.terminal_task_id
            WHERE tl.fk_project_id = ${data.projectId}::uuid
              AND p.depth < ${MAX_TASK_GRAPH_DEPTH}
              AND NOT (tl.target_task_id = ANY(p.path_task_ids))
        )
        INSERT INTO task_link_materialized (
            fk_project_id,
            origin_task_id,
            terminal_task_id,
            path_task_ids,
            path_link_ids,
            path_link_labels,
            depth
        )
        SELECT
            ${data.projectId}::uuid,
            origin_task_id,
            terminal_task_id,
            path_task_ids,
            path_link_ids,
            path_link_labels,
            depth
        FROM paths
        RETURNING origin_task_id::text AS id
    `.execute(db);

    return result.rows.map((r) => r.id);
};

export const getDownstreamTaskIdsQuery = async (data: {
    projectId: string;
    taskId: string;
    limit: number;
    offset: number;
}): Promise<string[]> => {
    const result = await sql<{ target_task_id: string }>`
        SELECT target_task_id
        FROM task_link
        WHERE source_task_id = ${data.taskId}::uuid
          AND fk_project_id = ${data.projectId}::uuid
        LIMIT ${data.limit}
        OFFSET ${data.offset}
    `.execute(db);

    return result.rows.map((r) => r.target_task_id);
};

export const getLinksByTaskIdsQuery = async (
    projectId: string,
    taskIds: string[],
): Promise<
    Map<string, { direct: TaskLink[]; story: TaskLinkMaterialized[] }>
> => {
    if (taskIds.length === 0) return new Map();

    const [direct, story] = await Promise.all([
        sql<TaskLink>`
            SELECT 
                id, 
                fk_project_id AS "projectId", 
                source_task_id AS "sourceTaskId", 
                target_task_id AS "targetTaskId", 
                label,
                created_by AS "createdBy",
                created_at AS "createdAt"
            FROM task_link
            WHERE fk_project_id = ${projectId}::uuid
              AND (source_task_id = ANY(${taskIds}::uuid[]) OR target_task_id = ANY(${taskIds}::uuid[]))
        `.execute(db),
        sql<TaskLinkMaterialized>`
            SELECT 
                id, 
                fk_project_id AS "projectId", 
                origin_task_id AS "originTaskId", 
                terminal_task_id AS "terminalTaskId", 
                path_task_ids AS "pathTaskIds", 
                path_link_ids AS "pathLinkIds", 
                path_link_labels AS "pathLinkLabels", 
                depth, 
                created_at AS "createdAt"
            FROM task_link_materialized
            WHERE fk_project_id = ${projectId}::uuid
              AND (origin_task_id = ANY(${taskIds}::uuid[]) OR terminal_task_id = ANY(${taskIds}::uuid[]))
        `.execute(db),
    ]);

    const resultMap = new Map<
        string,
        { direct: TaskLink[]; story: TaskLinkMaterialized[] }
    >();
    taskIds.forEach((id) => resultMap.set(id, { direct: [], story: [] }));

    direct.rows.forEach((link) => {
        if (resultMap.has(link.sourceTaskId))
            resultMap.get(link.sourceTaskId)!.direct.push(link);
        if (resultMap.has(link.targetTaskId))
            resultMap.get(link.targetTaskId)!.direct.push(link);
    });

    story.rows.forEach((s) => {
        if (resultMap.has(s.originTaskId)) resultMap.get(s.originTaskId)!.story.push(s);
        if (resultMap.has(s.terminalTaskId))
            resultMap.get(s.terminalTaskId)!.story.push(s);
    });

    return resultMap;
};

export const getTaskNetworkQuery = async (data: {
    userId: string;
    projectId: string;
    taskId: string;
    depth?: number;
    limit?: number;
}): Promise<{ incoming: TaskLinkMaterialized[]; outgoing: TaskLinkMaterialized[] }> => {
    const depth = Math.max(1, Math.min(data.depth ?? 3, MAX_TASK_GRAPH_DEPTH));
    const limit = Math.max(1, Math.min(data.limit ?? 20, 100));

    const authCheck = await sql`
        SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
        UNION ALL
        SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
        LIMIT 1
    `.execute(db);

    if (authCheck.rows.length === 0) throw new Error('Unauthorized');

    const selectPath = sql<TaskLinkMaterialized>`
        SELECT 
            id, 
            fk_project_id AS "projectId", 
            origin_task_id AS "originTaskId", 
            terminal_task_id AS "terminalTaskId", 
            path_task_ids AS "pathTaskIds", 
            path_link_ids AS "pathLinkIds", 
            path_link_labels AS "pathLinkLabels", 
            depth, 
            created_at AS "createdAt"
        FROM task_link_materialized
    `;

    const [incoming, outgoing] = await Promise.all([
        sql<TaskLinkMaterialized>`
            ${selectPath}
            WHERE fk_project_id = ${data.projectId}::uuid
              AND terminal_task_id = ${data.taskId}::uuid
              AND depth <= ${depth}
            ORDER BY depth ASC, created_at DESC
            LIMIT ${limit}
        `.execute(db),
        sql<TaskLinkMaterialized>`
            ${selectPath}
            WHERE fk_project_id = ${data.projectId}::uuid
              AND origin_task_id = ${data.taskId}::uuid
              AND depth <= ${depth}
            ORDER BY depth ASC, created_at DESC
            LIMIT ${limit}
        `.execute(db),
    ]);

    return { incoming: incoming.rows, outgoing: outgoing.rows };
};
