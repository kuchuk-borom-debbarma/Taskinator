import { type ExpressionBuilder, sql, type Transaction } from 'kysely';
import { type Database, db } from '../../../infra/database';
import { ConflictError, NotFoundError } from '../../../infra/graphql/errors.ts';
import {
    EVENT_STREAMS,
    EVENT_TYPES,
} from '../../../infra/utils/event-bus/constants.ts';
import { decodeCursor, encodeCursor } from '../../../infra/utils/utils.ts';
import type {
    GetNeighbourhoodParam,
    PaginationParams,
    Task,
    TaskContextRow,
    TaskLink,
    TaskNeighbourhoodResult,
} from '../TaskService.ts';

export const getTasksPage = async (
    userId: string,
    projectId: string | null,
    params: PaginationParams,
): Promise<{
    tasks: Task[];
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
    const limit = Math.min(params.first || params.last || 10, 50);
    const { after, before } = params;
    const isBackward = !!before;
    const cursor = before || after;

    let cursorEpoch: string | null = null;
    let cursorId: string | null = null;

    if (cursor) {
        const decoded = decodeCursor(cursor);
        cursorEpoch = decoded.timeValue;
        cursorId = decoded.id;
    }

    const result = await sql<Task & { epochPrecision: string }>`
        WITH auth_check AS (
            SELECT 1 WHERE ${projectId}::uuid IS NULL AND ${params.memberId ?? null}::text IS NOT NULL
            UNION ALL
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            LIMIT 1
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
            created_by AS "createdBy",
            updated_by AS "updatedBy",
            priority,
            created_at AS "createdAt",
            created_at::text as "epochPrecision",
            updated_at AS "updatedAt",
            direct_incoming_count AS "directIncomingCount",
            direct_outgoing_count AS "directOutgoingCount",
            total_incoming_count AS "totalIncomingCount",
            total_outgoing_count AS "totalOutgoingCount",
            incoming_label_counts AS "incomingLabelCounts",
            outgoing_label_counts AS "outgoingLabelCounts"
        FROM project_task
        WHERE EXISTS (SELECT 1 FROM auth_check)
          AND (
            (${projectId}::uuid IS NULL AND fk_member_id = ${params.memberId}) 
            OR (fk_project_id = ${projectId}::uuid)
          )
          AND (
            ${params.teamId ?? null}::uuid IS NULL OR fk_team_id = ${params.teamId}::uuid
          )
          AND (
            ${params.memberId ?? null}::text IS NULL OR fk_member_id = ${params.memberId}
          )
          AND (
            ${params.search ?? null}::text IS NULL
            OR title ILIKE ${`%${params.search}%`}
            OR description ILIKE ${`%${params.search}%`}
          )
          AND (
            ${params.status ?? null}::text IS NULL
            OR status = ${params.status}
          )
          AND (
            ${params.priority ?? null}::integer IS NULL
            OR priority = ${params.priority}
          )
          AND (
            ${cursorEpoch}::text IS NULL
            OR (
                CASE 
                  WHEN ${isBackward} THEN (created_at > ${cursorEpoch}::timestamptz OR (created_at = ${cursorEpoch}::timestamptz AND id > ${cursorId}::uuid))
                  ELSE (created_at < ${cursorEpoch}::timestamptz OR (created_at = ${cursorEpoch}::timestamptz AND id < ${cursorId}::uuid))
                END
            )
          )
        ORDER BY created_at ${sql.raw(isBackward ? 'ASC' : 'DESC')}, id ${sql.raw(isBackward ? 'ASC' : 'DESC')}
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
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (tasks.length > 0) {
        const first = tasks[0]!;
        const last = tasks[tasks.length - 1]!;
        const firstEpoch = (first as any).epochPrecision;
        const lastEpoch = (last as any).epochPrecision;

        if (isBackward) {
            nextCursor = encodeCursor(lastEpoch, last.id);
            prevCursor = hasMore ? encodeCursor(firstEpoch, first.id) : null;
        } else {
            nextCursor = hasMore ? encodeCursor(lastEpoch, last.id) : null;
            prevCursor = after ? encodeCursor(firstEpoch, first.id) : null;
        }
    }

    return { tasks, nextCursor, prevCursor };
};

export const getTasksByIds = async (ids: string[]): Promise<Task[]> => {
    if (ids.length === 0) return [];

    const result = await sql<Task>`
        SELECT 
            id,
            fk_project_id AS "projectId",
            fk_team_id AS "teamId",
            fk_member_id AS "memberId",
            title,
            description,
            status,
            version,
            created_by AS "createdBy",
            updated_by AS "updatedBy",
            priority,
            created_at AS "createdAt",
            updated_at AS "updatedAt",
            direct_incoming_count AS "directIncomingCount",
            direct_outgoing_count AS "directOutgoingCount",
            total_incoming_count AS "totalIncomingCount",
            total_outgoing_count AS "totalOutgoingCount",
            incoming_label_counts AS "incomingLabelCounts",
            outgoing_label_counts AS "outgoingLabelCounts"
        FROM project_task
        WHERE id = ANY(${ids}::uuid[])
    `.execute(db);

    return result.rows;
};

export const getTasksByActorIdAndIds = async (
    userId: string,
    ids: string[],
): Promise<Task[]> => {
    if (ids.length === 0) return [];

    const result = await sql<Task>`
        SELECT 
            id,
            fk_project_id AS "projectId",
            fk_team_id AS "teamId",
            fk_member_id AS "memberId",
            title,
            description,
            status,
            version,
            created_by AS "createdBy",
            updated_by AS "updatedBy",
            priority,
            created_at AS "createdAt",
            updated_at AS "updatedAt",
            direct_incoming_count AS "directIncomingCount",
            direct_outgoing_count AS "directOutgoingCount",
            total_incoming_count AS "totalIncomingCount",
            total_outgoing_count AS "totalOutgoingCount",
            incoming_label_counts AS "incomingLabelCounts",
            outgoing_label_counts AS "outgoingLabelCounts"
        FROM project_task
        WHERE id = ANY(${ids}::uuid[])
          AND EXISTS (
              SELECT 1 FROM project p 
              LEFT JOIN project_member pm ON pm.fk_project_id = p.id
              WHERE p.id = project_task.fk_project_id
                AND (
                    p.fk_user_id = ${userId}::text
                    OR pm.fk_user_id = ${userId}::text
                    OR ${userId}::text LIKE 'system:%'
                )
          )
    `.execute(db);

    return result.rows;
};

export const getTaskLinksPage = async (
    userId: string,
    projectId: string,
    taskId: string,
    direction: 'incoming' | 'outgoing' | 'both',
    depthLimit: number | undefined,
    params: PaginationParams,
): Promise<{
    links: TaskLink[];
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
    if (direction === 'both') {
        return getTaskNeighbourLinksPage(
            userId,
            projectId,
            taskId,
            depthLimit,
            params,
        );
    }

    const limit = Math.min(params.first || params.last || 10, 50);
    const { after, before } = params;
    const isBackward = !!before;
    const cursor = before || after;

    let cursorEpoch: string | null = null;
    let cursorId: string | null = null;

    if (cursor) {
        const decoded = decodeCursor(cursor);
        cursorEpoch = decoded.timeValue;
        cursorId = decoded.id;
    }

    const result = await sql<TaskLink & { epochPrecision: string }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            LIMIT 1
        )
        SELECT 
            id, 
            fk_project_id AS "projectId", 
            source_task_id AS "sourceTaskId", 
            target_task_id AS "targetTaskId", 
            label, 
            created_by AS "createdBy", 
            created_at AS "createdAt",
            created_at::text as "epochPrecision"
        FROM task_link
        WHERE EXISTS (SELECT 1 FROM auth_check)
          AND fk_project_id = ${projectId}::uuid
          AND (
            CASE 
              WHEN ${direction} = 'incoming' THEN target_task_id = ${taskId}::uuid
              ELSE source_task_id = ${taskId}::uuid
            END
          )
          AND (
            ${cursorEpoch}::text IS NULL
            OR (
                CASE 
                  WHEN ${isBackward} THEN (created_at > ${cursorEpoch}::timestamptz OR (created_at = ${cursorEpoch}::timestamptz AND id > ${cursorId}::uuid))
                  ELSE (created_at < ${cursorEpoch}::timestamptz OR (created_at = ${cursorEpoch}::timestamptz AND id < ${cursorId}::uuid))
                END
            )
          )
        ORDER BY created_at ${sql.raw(isBackward ? 'ASC' : 'DESC')}, id ${sql.raw(isBackward ? 'ASC' : 'DESC')}
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

    const links = rows;
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (links.length > 0) {
        const first = links[0]!;
        const last = links[links.length - 1]!;
        const firstEpoch = (first as any).epochPrecision;
        const lastEpoch = (last as any).epochPrecision;

        if (isBackward) {
            nextCursor = encodeCursor(lastEpoch, last.id);
            prevCursor = hasMore ? encodeCursor(firstEpoch, first.id) : null;
        } else {
            nextCursor = hasMore ? encodeCursor(lastEpoch, last.id) : null;
            prevCursor = after ? encodeCursor(firstEpoch, first.id) : null;
        }
    }

    return { links, nextCursor, prevCursor };
};

const getTaskNeighbourLinksPage = async (
    userId: string,
    projectId: string,
    taskId: string,
    depthLimit: number | undefined,
    params: PaginationParams,
): Promise<{
    links: TaskLink[];
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
    const limit = Math.min(params.first || params.last || 25, 100);
    const { after, before } = params;
    const isBackward = !!before;
    const cursor = before || after;

    let cursorDepth: number | null = null;
    let cursorEpoch: string | null = null;
    let cursorId: string | null = null;

    if (cursor) {
        const decoded = decodeCursor(cursor);
        const [depthValue, epochValue] = decoded.timeValue.split('~');
        cursorDepth = Number.parseInt(depthValue || '', 10);
        cursorEpoch = epochValue || null;
        cursorId = decoded.id || null;

        if (Number.isNaN(cursorDepth)) {
            cursorDepth = null;
        }
    }

    const result = await sql<
        TaskLink & { epochPrecision: string; graphDepth: number }
    >`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            LIMIT 1
        ),
        incoming_nodes AS (
            SELECT
                ancestor_task_id AS task_id,
                depth
            FROM task_reachability
            WHERE fk_project_id = ${projectId}::uuid
              AND descendant_task_id = ${taskId}::uuid
              AND (
                ${depthLimit ?? null}::int IS NULL
                OR depth <= ${depthLimit ?? null}::int
              )
        ),
        outgoing_nodes AS (
            SELECT
                descendant_task_id AS task_id,
                depth
            FROM task_reachability
            WHERE fk_project_id = ${projectId}::uuid
              AND ancestor_task_id = ${taskId}::uuid
              AND (
                ${depthLimit ?? null}::int IS NULL
                OR depth <= ${depthLimit ?? null}::int
              )
        ),
        node_depths AS (
            SELECT
                task_id,
                MIN(incoming_depth) AS incoming_depth,
                MIN(outgoing_depth) AS outgoing_depth,
                MIN(node_depth) AS node_depth
            FROM (
                SELECT
                    ${taskId}::uuid AS task_id,
                    NULL::int AS incoming_depth,
                    NULL::int AS outgoing_depth,
                    0 AS node_depth
                UNION ALL
                SELECT
                    task_id,
                    depth AS incoming_depth,
                    NULL::int AS outgoing_depth,
                    depth AS node_depth
                FROM incoming_nodes
                UNION ALL
                SELECT
                    task_id,
                    NULL::int AS incoming_depth,
                    depth AS outgoing_depth,
                    depth AS node_depth
                FROM outgoing_nodes
            ) AS seeded_nodes
            GROUP BY task_id
        ),
        candidate_links AS (
            SELECT
                tl.id,
                tl.fk_project_id AS "projectId",
                tl.source_task_id AS "sourceTaskId",
                tl.target_task_id AS "targetTaskId",
                tl.label,
                tl.created_by AS "createdBy",
                tl.created_at AS "createdAt",
                tl.created_at::text AS "epochPrecision",
                GREATEST(
                    COALESCE(source_nodes.node_depth, 0),
                    COALESCE(target_nodes.node_depth, 0)
                ) AS "graphDepth"
            FROM task_link tl
            JOIN node_depths source_nodes
                ON source_nodes.task_id = tl.source_task_id
            JOIN node_depths target_nodes
                ON target_nodes.task_id = tl.target_task_id
            WHERE EXISTS (SELECT 1 FROM auth_check)
              AND tl.fk_project_id = ${projectId}::uuid
              AND GREATEST(
                    COALESCE(source_nodes.node_depth, 0),
                    COALESCE(target_nodes.node_depth, 0)
                  ) > 0
        )
        SELECT *
        FROM candidate_links
        WHERE (
            ${cursorDepth}::int IS NULL
            OR (
                CASE
                    WHEN ${isBackward} THEN (
                        "graphDepth" < ${cursorDepth}::int
                        OR (
                            "graphDepth" = ${cursorDepth}::int
                            AND (
                                "createdAt" > ${cursorEpoch}::timestamptz
                                OR (
                                    "createdAt" = ${cursorEpoch}::timestamptz
                                    AND id > ${cursorId}::uuid
                                )
                            )
                        )
                    )
                    ELSE (
                        "graphDepth" > ${cursorDepth}::int
                        OR (
                            "graphDepth" = ${cursorDepth}::int
                            AND (
                                "createdAt" < ${cursorEpoch}::timestamptz
                                OR (
                                    "createdAt" = ${cursorEpoch}::timestamptz
                                    AND id < ${cursorId}::uuid
                                )
                            )
                        )
                    )
                END
            )
        )
        ORDER BY
            "graphDepth" ${sql.raw(isBackward ? 'DESC' : 'ASC')},
            "createdAt" ${sql.raw(isBackward ? 'ASC' : 'DESC')},
            id ${sql.raw(isBackward ? 'ASC' : 'DESC')}
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

    const links = rows;
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (links.length > 0) {
        const first = links[0]!;
        const last = links[links.length - 1]!;
        const firstCursor = encodeCursor(
            `${first.graphDepth}~${(first as any).epochPrecision}`,
            first.id,
        );
        const lastCursor = encodeCursor(
            `${last.graphDepth}~${(last as any).epochPrecision}`,
            last.id,
        );

        if (isBackward) {
            nextCursor = lastCursor;
            prevCursor = hasMore ? firstCursor : null;
        } else {
            nextCursor = hasMore ? lastCursor : null;
            prevCursor = after ? firstCursor : null;
        }
    }

    return { links, nextCursor, prevCursor };
};

export const getProjectTaskLinksPage = async (
    userId: string,
    projectId: string,
    params: PaginationParams,
): Promise<{
    links: TaskLink[];
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
    const limit = Math.min(params.first || params.last || 10, 50);
    const { after, before } = params;
    const isBackward = !!before;
    const cursor = before || after;

    let cursorEpoch: string | null = null;
    let cursorId: string | null = null;

    if (cursor) {
        const decoded = decodeCursor(cursor);
        cursorEpoch = decoded.timeValue;
        cursorId = decoded.id;
    }

    const result = await sql<TaskLink & { epochPrecision: string }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            LIMIT 1
        )
        SELECT 
            id, 
            fk_project_id AS "projectId", 
            source_task_id AS "sourceTaskId", 
            target_task_id AS "targetTaskId", 
            label, 
            created_by AS "createdBy", 
            created_at AS "createdAt",
            created_at::text as "epochPrecision"
        FROM task_link
        WHERE EXISTS (SELECT 1 FROM auth_check)
          AND fk_project_id = ${projectId}::uuid
          AND (
            ${cursorEpoch}::text IS NULL
            OR (
                CASE 
                  WHEN ${isBackward} THEN (created_at > ${cursorEpoch}::timestamptz OR (created_at = ${cursorEpoch}::timestamptz AND id > ${cursorId}::uuid))
                  ELSE (created_at < ${cursorEpoch}::timestamptz OR (created_at = ${cursorEpoch}::timestamptz AND id < ${cursorId}::uuid))
                END
            )
          )
        ORDER BY created_at ${sql.raw(isBackward ? 'ASC' : 'DESC')}, id ${sql.raw(isBackward ? 'ASC' : 'DESC')}
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

    const links = rows;
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (links.length > 0) {
        const first = links[0]!;
        const last = links[links.length - 1]!;
        const firstEpoch = (first as any).epochPrecision;
        const lastEpoch = (last as any).epochPrecision;

        if (isBackward) {
            nextCursor = encodeCursor(lastEpoch, last.id);
            prevCursor = hasMore ? encodeCursor(firstEpoch, first.id) : null;
        } else {
            nextCursor = hasMore ? encodeCursor(lastEpoch, last.id) : null;
            prevCursor = after ? encodeCursor(firstEpoch, first.id) : null;
        }
    }

    return { links, nextCursor, prevCursor };
};

export const getNeighbourhood = async (
    params: GetNeighbourhoodParam,
): Promise<TaskNeighbourhoodResult> => {
    // This is a complex query, we'll keep the existing implementation but wrap it in auth check if not already.
    // For now, let's just selection from existing implementation and ensure it uses Task type.
    const {
        userId,
        projectId,
        taskId,
        maxDepth = 3,
        first,
        after,
        last,
        before,
    } = params;

    // Auth check
    const auth = await sql<{ 1: number }>`
        SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
        UNION ALL
        SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
        LIMIT 1
    `.execute(db);

    if (auth.rows.length === 0) {
        return {
            neighbours: [],
            edges: [],
            nextCursor: null,
            prevCursor: null,
        };
    }

    // Simplified for now, should call a complex reachability query.
    return {
        neighbours: [],
        edges: [],
        nextCursor: null,
        prevCursor: null,
    };
};

export const insertTask = async (param: {
    actorId: string;
    projectId: string;
    title: string;
    description?: string | null;
    status?: string | null;
    priority?: number | null;
    traceId?: string | null;
}): Promise<Task> => {
    const result = await sql<Task>`
        WITH authorized AS (
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 WHERE ${param.actorId}::text LIKE 'system:%'
            LIMIT 1
        ),
        inserted_task AS (
            INSERT INTO project_task (
                fk_project_id, 
                title, 
                description, 
                status, 
                priority,
                created_by, 
                updated_by
            )
            SELECT 
                ${param.projectId}::uuid, 
                ${param.title}, 
                ${param.description ?? ''}, 
                ${param.status ?? 'TODO'}, 
                ${param.priority ?? 0},
                ${param.actorId}, 
                ${param.actorId}
            WHERE EXISTS (SELECT 1 FROM authorized)
            RETURNING 
                id, 
                fk_project_id AS "projectId", 
                fk_team_id AS "teamId", 
                fk_member_id AS "memberId",
                title, 
                description, 
                status, 
                version, 
                created_by AS "createdBy", 
                updated_by AS "updatedBy",
                priority, 
                created_at AS "createdAt", 
                updated_at AS "updatedAt",
                direct_incoming_count AS "directIncomingCount",
                direct_outgoing_count AS "directOutgoingCount",
                total_incoming_count AS "totalIncomingCount",
                total_outgoing_count AS "totalOutgoingCount",
                incoming_label_counts AS "incomingLabelCounts",
                outgoing_label_counts AS "outgoingLabelCounts"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (stream, stream_key, payload)
            SELECT 
                'task-events',
                "projectId"::text,
                jsonb_build_object(
                    'type', 'task.created',
                    'taskId', id,
                    'projectId', "projectId",
                    'teamId', "teamId",
                    'memberId', "memberId",
                    'title', title,
                    'status', status,
                    'priority', priority,
                    'actorId', ${param.actorId}::text,
                    'traceId', ${param.traceId}::text
                )
            FROM inserted_task
        )
        SELECT * FROM inserted_task
    `.execute(db);

    const task = result.rows[0];
    if (!task) {
        throw new NotFoundError(
            `Project with ID ${param.projectId} not found or you do not have permission to create tasks in it.`,
        );
    }

    return task;
};

export const updateTask = async (param: {
    actorId: string;
    projectId: string;
    taskId: string;
    version: number;
    title?: string | null;
    description?: string | null;
    status?: string | null;
    teamId?: string | null;
    memberId?: string | null;
    priority?: number | null;
    traceId?: string | null;
}): Promise<Task> => {
    // 1. Build dynamic SET fragments
    const updates: any[] = [];
    if (param.title !== undefined) updates.push(sql`title = ${param.title}`);
    if (param.description !== undefined)
        updates.push(sql`description = ${param.description ?? ''}`);
    if (param.status !== undefined)
        updates.push(sql`status = ${param.status ?? 'TODO'}`);
    if (param.priority !== undefined)
        updates.push(sql`priority = ${param.priority ?? 0}`);

    // Assignment updates
    if (param.teamId !== undefined) {
        updates.push(sql`fk_team_id = ${param.teamId}::uuid`);
        // Rule: If team is removed, remove member assignment too
        if (param.teamId === null) {
            updates.push(sql`fk_member_id = NULL`);
        }
    }

    // Only update memberId if it was provided AND we aren't already nullifying it via team removal
    if (param.memberId !== undefined && param.teamId !== null) {
        updates.push(sql`fk_member_id = ${param.memberId}::text`);
    }

    if (updates.length === 0) {
        // No updates, just fetch and return current state (or maybe we should require version check anyway?)
        // To be safe and check optimistic lock, we'll still run a dummy update or just fetch.
        // But the requirement usually implies something changed.
    }

    updates.push(sql`version = version + 1`);
    updates.push(sql`updated_by = ${param.actorId}`);
    updates.push(sql`updated_at = NOW()`);

    const setClause = sql.join(updates, sql`, `);

    const result = await sql<Task>`
        WITH old_state AS (
            SELECT fk_team_id, fk_member_id, title, status, priority
            FROM project_task 
            WHERE id = ${param.taskId}::uuid
        ),
        authorized AS (
            -- Actor must be project owner or member or system
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 WHERE ${param.actorId}::text LIKE 'system:%'
            LIMIT 1
        ),
        validation AS (
            SELECT 1
            FROM old_state
            WHERE (
                -- If teamId is provided, it must be valid
                (NOT ${param.teamId !== undefined}::boolean) OR 
                ${param.teamId}::uuid IS NULL OR EXISTS (
                    SELECT 1 FROM project_team WHERE id = ${param.teamId}::uuid AND fk_project_id = ${param.projectId}::uuid
                )
            ) AND (
                -- Same for memberId
                (NOT ${param.memberId !== undefined}::boolean) OR
                ${param.memberId}::text IS NULL OR EXISTS (
                    SELECT 1 FROM project_member WHERE fk_user_id = ${param.memberId}::text AND fk_project_id = ${param.projectId}::uuid
                )
            ) AND (
                -- Final state must be consistent
                (
                    COALESCE(${param.teamId}::uuid, old_state.fk_team_id) IS NULL OR 
                    COALESCE(${param.memberId}::text, old_state.fk_member_id) IS NULL
                ) OR EXISTS (
                    SELECT 1 FROM project_team_member 
                    WHERE fk_team_id = COALESCE(${param.teamId}::uuid, old_state.fk_team_id)
                      AND fk_user_id = COALESCE(${param.memberId}::text, old_state.fk_member_id)
                )
            )
        ),
        updated_task AS (
            UPDATE project_task SET 
                prev_status = status,
                prev_priority = priority,
                prev_title = title,
                prev_team_id = fk_team_id,
                prev_member_id = fk_member_id,
                ${setClause}
            WHERE id = ${param.taskId}::uuid
              AND fk_project_id = ${param.projectId}::uuid
              AND version = ${param.version}
              AND EXISTS (SELECT 1 FROM authorized)
              AND EXISTS (SELECT 1 FROM validation)
            RETURNING 
                id, 
                fk_project_id AS "projectId", 
                fk_team_id AS "teamId", 
                fk_member_id AS "memberId",
                title, 
                description, 
                status, 
                version, 
                created_by AS "createdBy", 
                updated_by AS "updatedBy",
                priority, 
                created_at AS "createdAt", 
                updated_at AS "updatedAt",
                direct_incoming_count AS "directIncomingCount",
                direct_outgoing_count AS "directOutgoingCount",
                total_incoming_count AS "totalIncomingCount",
                total_outgoing_count AS "totalOutgoingCount",
                incoming_label_counts AS "incomingLabelCounts",
                outgoing_label_counts AS "outgoingLabelCounts"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (stream, stream_key, payload)
            SELECT 
                'task-events',
                u."projectId"::text,
                jsonb_build_object(
                    'type', 'task.updated',
                    'taskId', u.id,
                    'projectId', u."projectId",
                    'old', jsonb_build_object(
                        'teamId', o.fk_team_id,
                        'memberId', o.fk_member_id,
                        'title', o.title,
                        'status', o.status,
                        'priority', o.priority
                    ),
                    'new', jsonb_build_object(
                        'teamId', u."teamId",
                        'memberId', u."memberId",
                        'title', u.title,
                        'status', u.status,
                        'priority', u.priority
                    ),
                    'actorId', ${param.actorId}::text,
                    'traceId', ${param.traceId}::text
                )
            FROM updated_task u, old_state o
        )
        SELECT * FROM updated_task
    `.execute(db);

    const task = result.rows[0];
    if (!task) {
        // Distinguish why it failed
        const exists = await sql<{ id: string; version: number }>`
            SELECT id, version FROM project_task WHERE id = ${param.taskId}::uuid AND fk_project_id = ${param.projectId}::uuid
        `.execute(db);

        if (exists.rows.length === 0) {
            throw new NotFoundError(
                `Task with ID ${param.taskId} not found in project ${param.projectId}.`,
            );
        }

        const currentTask = exists.rows[0];
        if (!currentTask) {
            throw new NotFoundError(
                `Task with ID ${param.taskId} not found in project ${param.projectId}.`,
            );
        }
        if (currentTask.version !== param.version) {
            throw new ConflictError(
                `Task version mismatch. Expected ${param.version}, but current version is ${currentTask.version}.`,
            );
        }

        // If it still failed, it's likely validation or auth
        throw new NotFoundError(
            `Unauthorized or validation failed for task update (Team/Member assignment rules).`,
        );
    }

    return task;
};

export const deleteTask = async (param: {
    actorId: string;
    projectId: string;
    taskId: string;
}): Promise<string> => {
    const result = await sql<{ id: string }>`
        WITH authorized AS (
            -- Actor must be project owner or member or system
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 WHERE ${param.actorId}::text LIKE 'system:%'
            LIMIT 1
        ),
        deleted_task AS (
            DELETE FROM project_task
            WHERE id = ${param.taskId}::uuid
              AND fk_project_id = ${param.projectId}::uuid
              AND EXISTS (SELECT 1 FROM authorized)
            RETURNING id, fk_project_id, fk_team_id
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (stream, stream_key, payload)
            SELECT 
                'task-events',
                fk_project_id::text,
                jsonb_build_object(
                    'type', 'task.deleted',
                    'taskId', id,
                    'projectId', fk_project_id,
                    'teamId', fk_team_id,
                    'actorId', ${param.actorId}::text
                )
            FROM deleted_task
        )
        SELECT id FROM deleted_task
    `.execute(db);

    const deletedId = result.rows[0]?.id;
    if (!deletedId) {
        throw new NotFoundError(
            `Task with ID ${param.taskId} not found or unauthorized in project ${param.projectId}.`,
        );
    }

    return deletedId;
};

export const insertTaskLink = async (param: {
    actorId: string;
    projectId: string;
    sourceTaskId: string;
    targetTaskId: string;
    label: string;
}): Promise<TaskLink> => {
    const result = await sql<TaskLink>`
        WITH authorized AS (
            -- Actor must be project owner or member or system
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 WHERE ${param.actorId}::text LIKE 'system:%'
            LIMIT 1
        ),
        validation AS (
            SELECT 1
            WHERE ${param.sourceTaskId} != ${param.targetTaskId}
              AND EXISTS (SELECT 1 FROM project_task WHERE id = ${param.sourceTaskId}::uuid AND fk_project_id = ${param.projectId}::uuid)
              AND EXISTS (SELECT 1 FROM project_task WHERE id = ${param.targetTaskId}::uuid AND fk_project_id = ${param.projectId}::uuid)
        ),
        inserted_link AS (
            INSERT INTO task_link (fk_project_id, source_task_id, target_task_id, label, created_by)
            SELECT ${param.projectId}::uuid, ${param.sourceTaskId}::uuid, ${param.targetTaskId}::uuid, ${param.label}, ${param.actorId}::text
            WHERE EXISTS (SELECT 1 FROM authorized)
              AND EXISTS (SELECT 1 FROM validation)
            RETURNING 
                id, 
                fk_project_id, 
                source_task_id, 
                target_task_id, 
                label, 
                created_by, 
                created_at
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (stream, stream_key, payload)
            SELECT 
                ${EVENT_STREAMS.TASK},
                fk_project_id::text,
                jsonb_build_object(
                    'type', ${EVENT_TYPES.TASK_LINK.CREATED}::text,
                    'linkId', id,
                    'projectId', fk_project_id,
                    'sourceTaskId', source_task_id,
                    'targetTaskId', target_task_id,
                    'label', label,
                    'actorId', ${param.actorId}::text
                )
            FROM inserted_link
        )
        SELECT 
            id, 
            fk_project_id AS "projectId", 
            source_task_id AS "sourceTaskId", 
            target_task_id AS "targetTaskId", 
            label, 
            created_by AS "createdBy", 
            created_at AS "createdAt"
        FROM inserted_link
    `.execute(db);

    const link = result.rows[0];
    if (!link) {
        throw new NotFoundError(
            `Unable to create link. Ensure tasks exist in project ${param.projectId}, source != target, and you are authorized.`,
        );
    }

    return link;
};

export const deleteTaskLink = async (param: {
    actorId: string;
    projectId: string;
    linkId: string;
}): Promise<string> => {
    const result = await sql<{ id: string }>`
        WITH authorized AS (
            -- Actor must be project owner or member or system
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 WHERE ${param.actorId}::text LIKE 'system:%'
            LIMIT 1
        ),
        deleted_link AS (
            DELETE FROM task_link
            WHERE id = ${param.linkId}::uuid
              AND fk_project_id = ${param.projectId}::uuid
              AND EXISTS (SELECT 1 FROM authorized)
            RETURNING 
                id, 
                fk_project_id,
                source_task_id,
                target_task_id
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (stream, stream_key, payload)
            SELECT 
                ${EVENT_STREAMS.TASK},
                fk_project_id::text,
                jsonb_build_object(
                    'type', ${EVENT_TYPES.TASK_LINK.DELETED}::text,
                    'linkId', id,
                    'projectId', fk_project_id,
                    'sourceTaskId', source_task_id,
                    'targetTaskId', target_task_id,
                    'actorId', ${param.actorId}::text
                )
            FROM deleted_link
        )
        SELECT id FROM deleted_link
    `.execute(db);

    const deletedId = result.rows[0]?.id;
    if (!deletedId) {
        throw new NotFoundError(
            `Link with ID ${param.linkId} not found or unauthorized in project ${param.projectId}.`,
        );
    }

    return deletedId;
};

export const updateTaskLink = async (param: {
    actorId: string;
    projectId: string;
    linkId: string;
    sourceTaskId?: string | null;
    targetTaskId?: string | null;
    label?: string | null;
}): Promise<TaskLink> => {
    const result = await sql<TaskLink>`
        WITH authorized AS (
            -- Actor must be project owner or member or system
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 WHERE ${param.actorId}::text LIKE 'system:%'
            LIMIT 1
        ),
        current_link AS (
            SELECT source_task_id, target_task_id FROM task_link WHERE id = ${param.linkId}::uuid AND fk_project_id = ${param.projectId}::uuid
        ),
        validation AS (
            SELECT 1
            WHERE (SELECT 1 FROM current_link) IS NOT NULL
              AND COALESCE(${param.sourceTaskId}::uuid, (SELECT source_task_id FROM current_link)) != 
                  COALESCE(${param.targetTaskId}::uuid, (SELECT target_task_id FROM current_link))
              AND (${param.sourceTaskId}::uuid IS NULL OR EXISTS (SELECT 1 FROM project_task WHERE id = ${param.sourceTaskId}::uuid AND fk_project_id = ${param.projectId}::uuid))
              AND (${param.targetTaskId}::uuid IS NULL OR EXISTS (SELECT 1 FROM project_task WHERE id = ${param.targetTaskId}::uuid AND fk_project_id = ${param.projectId}::uuid))
        ),
        updated_link AS (
            UPDATE task_link
            SET 
                source_task_id = COALESCE(${param.sourceTaskId}::uuid, source_task_id),
                target_task_id = COALESCE(${param.targetTaskId}::uuid, target_task_id),
                label = COALESCE(${param.label}, label)
            WHERE id = ${param.linkId}::uuid
              AND fk_project_id = ${param.projectId}::uuid
              AND EXISTS (SELECT 1 FROM authorized)
              AND EXISTS (SELECT 1 FROM validation)
            RETURNING 
                id, 
                fk_project_id, 
                source_task_id, 
                target_task_id, 
                label, 
                created_by, 
                created_at
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (stream, stream_key, payload)
            SELECT 
                ${EVENT_STREAMS.TASK},
                fk_project_id::text,
                jsonb_build_object(
                    'type', ${EVENT_TYPES.TASK_LINK.UPDATED}::text,
                    'linkId', id,
                    'projectId', fk_project_id,
                    'oldSourceTaskId', (SELECT source_task_id FROM current_link),
                    'oldTargetTaskId', (SELECT target_task_id FROM current_link),
                    'newSourceTaskId', source_task_id,
                    'newTargetTaskId', target_task_id,
                    'label', label,
                    'actorId', ${param.actorId}::text
                )
            FROM updated_link
        )
        SELECT 
            id, 
            fk_project_id AS "projectId", 
            source_task_id AS "sourceTaskId", 
            target_task_id AS "targetTaskId", 
            label, 
            created_by AS "createdBy", 
            created_at AS "createdAt"
        FROM updated_link
    `.execute(db);

    const link = result.rows[0];
    if (!link) {
        throw new NotFoundError(
            `Unable to update link. Ensure link exists in project ${param.projectId}, source != target, and you are authorized.`,
        );
    }

    return link;
};

export const deleteProjectTasksByProjectIds = async (
    projectIds: string[],
): Promise<{ deletedCount: number }> => {
    if (projectIds.length === 0) return { deletedCount: 0 };

    const result = await sql<{ id: string }>`
        DELETE FROM project_task
        WHERE fk_project_id = ANY(${projectIds}::uuid[])
        RETURNING id
    `.execute(db);

    return { deletedCount: result.rows.length };
};

export const deleteProjectTaskLinksByProjectIds = async (
    projectIds: string[],
): Promise<{ deletedCount: number }> => {
    if (projectIds.length === 0) return { deletedCount: 0 };

    const result = await sql<{ id: string }>`
        DELETE FROM task_link
        WHERE fk_project_id = ANY(${projectIds}::uuid[])
        RETURNING id
    `.execute(db);

    return { deletedCount: result.rows.length };
};

export const unassignTasksByTeamIds = async (
    teamIds: string[],
): Promise<{ updatedCount: number }> => {
    if (teamIds.length === 0) return { updatedCount: 0 };

    const result = await sql<{ id: string }>`
        UPDATE project_task
        SET 
            prev_team_id = fk_team_id,
            prev_member_id = fk_member_id,
            fk_team_id = NULL,
            fk_member_id = NULL,
            updated_at = NOW()
        WHERE fk_team_id = ANY(${teamIds}::uuid[])
        RETURNING id
    `.execute(db);

    return { updatedCount: result.rows.length };
};

/**
 * Batch unassigns members from project tasks across multiple projects.
 */
export const unassignMembersFromProjectTasksBatch = async (
    deltas: { projectId: string; userIds: string[] }[],
): Promise<{ updatedCount: number }> => {
    if (deltas.length === 0) return { updatedCount: 0 };

    // We unnest the projectId and userIds.
    // Since userIds is an array, we unnest an array of arrays.
    const projectIds = deltas.map((d) => d.projectId);
    const userIdsList = deltas.map((d) => d.userIds);

    const result = await sql<{ id: string }>`
        UPDATE project_task
        SET 
            prev_member_id = fk_member_id,
            fk_member_id = NULL,
            updated_at = NOW()
        FROM (
            SELECT 
                unnest(${projectIds}::uuid[]) as pid,
                unnest(${userIdsList}::text[][]) as uids
        ) AS V
        WHERE project_task.fk_project_id = V.pid
          AND project_task.fk_member_id = ANY(V.uids)
        RETURNING id
    `.execute(db);

    return { updatedCount: result.rows.length };
};

/**
 * Batch unassigns members from team tasks across multiple teams.
 */
export const unassignTeamMembersFromTasksBatch = async (
    deltas: { teamId: string; userIds: string[] }[],
): Promise<{ updatedCount: number }> => {
    if (deltas.length === 0) return { updatedCount: 0 };

    const teamIds = deltas.map((d) => d.teamId);
    const userIdsList = deltas.map((d) => d.userIds);

    const result = await sql<{ id: string }>`
        UPDATE project_task
        SET 
            prev_member_id = fk_member_id,
            fk_member_id = NULL,
            updated_at = NOW()
        FROM (
            SELECT 
                unnest(${teamIds}::uuid[]) as tid,
                unnest(${userIdsList}::text[][]) as uids
        ) AS V
        WHERE project_task.fk_team_id = V.tid
          AND project_task.fk_member_id = ANY(V.uids)
        RETURNING id
    `.execute(db);

    return { updatedCount: result.rows.length };
};

export const deleteTaskLinksByTaskIds = async (
    taskIds: string[],
    trx?: Transaction<Database>,
): Promise<void> => {
    if (taskIds.length === 0) return;
    await sql`
        DELETE FROM task_link 
        WHERE source_task_id = ANY(${taskIds}::uuid[]) 
           OR target_task_id = ANY(${taskIds}::uuid[])
    `.execute(trx || db);
};

export const deleteReachabilityByTaskIds = async (
    taskIds: string[],
): Promise<void> => {
    if (taskIds.length === 0) return;
    await sql`
        DELETE FROM task_reachability 
        WHERE ancestor_task_id = ANY(${taskIds}::uuid[]) 
           OR descendant_task_id = ANY(${taskIds}::uuid[])
    `.execute(db);
};

/**
 * High-performance batch update for direct task link counters.
 * Processes an entire batch of tasks across potentially multiple projects in a single SQL call.
 */
export const updateTaskDirectLinkCountsBatch = async (
    deltas: {
        taskId: string;
        projectId: string;
        incomingDelta: number;
        outgoingDelta: number;
    }[],
) => {
    if (deltas.length === 0) return;

    const taskIds = deltas.map((d) => d.taskId);
    const projectIds = deltas.map((d) => d.projectId);
    const incDeltas = deltas.map((d) => d.incomingDelta);
    const outDeltas = deltas.map((d) => d.outgoingDelta);

    await sql`
        UPDATE project_task
        SET 
            direct_incoming_count = project_task.direct_incoming_count + V.inc,
            direct_outgoing_count = project_task.direct_outgoing_count + V.out,
            updated_at = CURRENT_TIMESTAMP
        FROM (
            SELECT 
                unnest(${taskIds}::uuid[]) as tid,
                unnest(${projectIds}::uuid[]) as pid,
                unnest(${incDeltas}::integer[]) as inc,
                unnest(${outDeltas}::integer[]) as out
        ) AS V
        WHERE project_task.id = V.tid
          AND project_task.fk_project_id = V.pid
    `.execute(db);
};

/**
 * High-performance batch update for task link counters.
 */
export const updateTaskLinkCountsBatch = async (
    projectId: string,
    deltas: { taskId: string; incomingDelta: number; outgoingDelta: number }[],
) => {
    if (deltas.length === 0) return;

    const taskIds = deltas.map((d) => d.taskId);
    const incDeltas = deltas.map((d) => d.incomingDelta);
    const outDeltas = deltas.map((d) => d.outgoingDelta);

    await sql`
        UPDATE project_task
        SET 
            direct_incoming_count = project_task.direct_incoming_count + V.inc,
            direct_outgoing_count = project_task.direct_outgoing_count + V.out,
            updated_at = CURRENT_TIMESTAMP
        FROM (
            SELECT 
                unnest(${taskIds}::uuid[]) as tid,
                unnest(${incDeltas}::integer[]) as inc,
                unnest(${outDeltas}::integer[]) as out
        ) AS V
        WHERE project_task.id = V.tid
          AND project_task.fk_project_id = ${projectId}::uuid
    `.execute(db);
};

/**
 * Atomic removal of all task-related data for specific projects.
 */
export async function purgeTaskDataByProjectIds(
    trx: any,
    projectIds: string[],
): Promise<void> {
    if (projectIds.length === 0) return;

    await trx
        .deleteFrom('task_reachability')
        .where('fk_project_id', 'in', projectIds)
        .execute();

    await trx
        .deleteFrom('task_link')
        .where('fk_project_id', 'in', projectIds)
        .execute();

    await trx
        .deleteFrom('project_task')
        .where('fk_project_id', 'in', projectIds)
        .execute();
}

/**
 * Atomic removal of specific tasks and their incident links/reachability.
 */
export async function purgeLocalTaskDataByTaskIds(
    trx: any,
    taskIds: string[],
): Promise<void> {
    if (taskIds.length === 0) return;

    await trx
        .deleteFrom('task_reachability')
        .where((eb: any) =>
            eb.or([
                eb('ancestor_task_id', 'in', taskIds),
                eb('descendant_task_id', 'in', taskIds),
            ]),
        )
        .execute();

    await trx
        .deleteFrom('task_link')
        .where((eb: any) =>
            eb.or([
                eb('source_task_id', 'in', taskIds),
                eb('target_task_id', 'in', taskIds),
            ]),
        )
        .execute();

    await trx.deleteFrom('project_task').where('id', 'in', taskIds).execute();
}

/**
 * Bulk unassigns project members from tasks across multiple projects.
 * [Action]: UNASSIGN_PROJECT_TASK_MEMBER
 */
export const unassignProjectTaskMembersBatch = async (
    deltas: { projectId: string; userIds: string[] }[],
    trx?: Transaction<Database>,
): Promise<{ affectedCount: number }> => {
    if (deltas.length === 0) return { affectedCount: 0 };

    // NOTE: We loop per delta rather than using unnest(::text[][]) because Kysely
    // cannot serialize a nested JS string[][] into a PostgreSQL text[][] parameter,
    // causing error 42809 "requires array on right side".
    let totalAffected = 0;

    for (const { projectId, userIds } of deltas) {
        if (userIds.length === 0) continue;

        const result = await sql`
            UPDATE project_task
            SET prev_member_id = fk_member_id,
                fk_member_id = NULL,
                updated_at = NOW()
            WHERE fk_project_id = ${projectId}::uuid
              AND fk_member_id = ANY(${userIds}::text[])
        `.execute(trx || db);

        totalAffected += Number((result as any).numUpdatedRows ?? 0);
    }

    return { affectedCount: totalAffected };
};

/**
 * Bulk decommissions tasks for specified projects.
 * [Action]: DELETE_PROJECT_TASK
 */
/**
 * Maximum rows to touch in a single deletion transaction.
 * Keeps lock windows short. Tune via this constant only.
 */
export const BULK_DELETE_CHUNK_SIZE = 2_000;

/**
 * Chunked deletion of project tasks.
 * Deletes at most BULK_DELETE_CHUNK_SIZE rows per call.
 * Returns the number of rows actually deleted so the caller
 * can decide whether to emit a continuation signal.
 * Replaces the old unbounded deleteProjectTasksBatch.
 */
export async function deleteProjectTasksChunk(
    projectIds: string[],
    trx?: Transaction<Database>,
): Promise<{ affectedCount: number }> {
    if (projectIds.length === 0) return { affectedCount: 0 };

    const result = await sql<{ id: string }>`
        DELETE FROM project_task
        WHERE id IN (
            SELECT id FROM project_task
            WHERE fk_project_id = ANY(${projectIds}::uuid[])
            LIMIT ${BULK_DELETE_CHUNK_SIZE}
        )
        RETURNING id
    `.execute(trx || db);

    return { affectedCount: result.rows.length };
}

/**
 * Chunked deletion of project task links.
 * Deletes at most BULK_DELETE_CHUNK_SIZE rows per call.
 * Replaces the old unbounded deleteProjectTaskLinksBatch.
 */
export async function deleteProjectTaskLinksChunk(
    projectIds: string[],
    trx?: Transaction<Database>,
): Promise<{ affectedCount: number }> {
    if (projectIds.length === 0) return { affectedCount: 0 };

    const result = await sql<{ id: string }>`
        DELETE FROM task_link
        WHERE id IN (
            SELECT id FROM task_link
            WHERE fk_project_id = ANY(${projectIds}::uuid[])
            LIMIT ${BULK_DELETE_CHUNK_SIZE}
        )
        RETURNING id
    `.execute(trx || db);

    return { affectedCount: result.rows.length };
}

/**
 * Chunked deletion of project-scoped task reachability rows.
 * Returns the count of deleted rows and the distinct project IDs
 * that were touched — the latter is used to scope the repair CTE
 * only on the final chunk (when affectedCount < BULK_DELETE_CHUNK_SIZE).
 *
 * Uses ctid (PostgreSQL physical row address) for the subquery because
 * task_reachability has a composite PK and no surrogate id column.
 * ctid is stable within a single statement execution.
 */
export async function deleteProjectTaskReachabilityChunk(
    projectIds: string[],
    trx?: Transaction<Database>,
): Promise<{ affectedCount: number; touchedProjectIds: string[] }> {
    if (projectIds.length === 0)
        return { affectedCount: 0, touchedProjectIds: [] };

    const result = await sql<{ fk_project_id: string }>`
        DELETE FROM task_reachability
        WHERE ctid IN (
            SELECT ctid FROM task_reachability
            WHERE fk_project_id = ANY(${projectIds}::uuid[])
            LIMIT ${BULK_DELETE_CHUNK_SIZE}
        )
        RETURNING fk_project_id
    `.execute(trx || db);

    const touchedProjectIds = [
        ...new Set(result.rows.map((r) => r.fk_project_id)),
    ];
    return { affectedCount: result.rows.length, touchedProjectIds };
}

/**
 * Bulk repair of Project Task counts.
 */
export async function incrementProjectTaskCountsBulk(
    trx: any,
    deltas: Map<string, number>,
): Promise<void> {
    const entries = Array.from(deltas.entries());
    if (entries.length === 0) return;

    const projectIds = entries.map(([pid]) => pid);
    const deltaList = entries.map(([, d]) => d);

    await sql`
        UPDATE project SET 
            tasks_count = project.tasks_count + v.delta,
            updated_at = NOW()
        FROM (
            SELECT * FROM UNNEST(${projectIds}::uuid[], ${deltaList}::int[])
        ) AS v(pid, delta)
        WHERE project.id = v.pid
    `.execute(trx);
}

/**
 * Finds all links associated with specific tasks for repair signaling.
 */
export async function findLinksForTaskRepair(
    taskIds: string[],
): Promise<any[]> {
    if (taskIds.length === 0) return [];

    return await db
        .selectFrom('task_link')
        .select(['id', 'fk_project_id', 'source_task_id', 'target_task_id'])
        .where((eb) =>
            eb.or([
                eb('source_task_id', 'in', taskIds),
                eb('target_task_id', 'in', taskIds),
            ]),
        )
        .execute();
}
/**
 * Surgically unassign users from tasks within a specific team.
 * [Action]: UNASSIGN_MEMBER_FROM_TEAM_TASKS
 */
export async function unassignMembersFromTeamTasksBatch(
    teamId: string,
    userIds: string[],
    trx?: any,
): Promise<{ affectedCount: number }> {
    if (userIds.length === 0) return { affectedCount: 0 };

    const result = await (trx || db)
        .updateTable('project_task')
        .set((eb: ExpressionBuilder<Database, 'project_task'>) => ({
            prev_member_id: eb.ref('fk_member_id'),
            fk_member_id: null,
        }))
        .where('fk_team_id', '=', teamId)
        .where('fk_member_id', 'in', userIds)
        .executeTakeFirst();

    return { affectedCount: Number(result.numUpdatedRows) };
}

/**
 * Orphan tasks when teams are deleted (keep tasks, but remove team/member associations).
 * [Action]: ORPHAN_TEAM_TASKS
 */
export async function orphanTasksByTeamIdsBatch(
    teamIds: string[],
    trx?: any,
): Promise<{ affectedCount: number }> {
    if (teamIds.length === 0) return { affectedCount: 0 };

    const result = await (trx || db)
        .updateTable('project_task')
        .set((eb: ExpressionBuilder<Database, 'project_task'>) => ({
            prev_team_id: eb.ref('fk_team_id'),
            prev_member_id: eb.ref('fk_member_id'),
            fk_team_id: null,
            fk_member_id: null,
        }))
        .where('fk_team_id', 'in', teamIds)
        .executeTakeFirst();

    return { affectedCount: Number(result.numUpdatedRows) };
}

/**
 * Closure Table Expansion: Connects all ancestors of 'sourceTaskId'
 * to all descendants of 'targetTaskId'.
 */
export const expandTaskReachability = async (
    trx: Transaction<Database>,
    projectId: string,
    sourceId: string,
    targetId: string,
): Promise<void> => {
    await sql`
        INSERT INTO task_reachability (fk_project_id, ancestor_task_id, descendant_task_id, depth)
        SELECT 
            ${projectId}::uuid,
            anc.ancestor_id,
            des.descendant_id,
            anc.depth + 1 + des.depth
        FROM 
            (
                SELECT ancestor_task_id as ancestor_id, depth 
                FROM task_reachability 
                WHERE descendant_task_id = ${sourceId}::uuid AND fk_project_id = ${projectId}::uuid
                UNION ALL 
                SELECT ${sourceId}::uuid, 0
            ) anc,
            (
                SELECT descendant_task_id as descendant_id, depth 
                FROM task_reachability 
                WHERE ancestor_task_id = ${targetId}::uuid AND fk_project_id = ${projectId}::uuid
                UNION ALL 
                SELECT ${targetId}::uuid, 0
            ) des
        WHERE EXISTS (SELECT 1 FROM project_task WHERE id = ${sourceId}::uuid)
          AND EXISTS (SELECT 1 FROM project_task WHERE id = ${targetId}::uuid)
        ON CONFLICT (fk_project_id, ancestor_task_id, descendant_task_id) 
        DO UPDATE SET depth = LEAST(task_reachability.depth, EXCLUDED.depth)
    `.execute(trx);
};

/**
 * Synchronizes denormalized reachability counters on the project_task table.
 */
export const syncTaskGraphCounters = async (
    trx: Transaction<Database>,
    projectId: string,
): Promise<void> => {
    await sql`
        UPDATE project_task 
        SET 
            direct_incoming_count = (
                SELECT COUNT(*) FROM task_link 
                WHERE target_task_id = project_task.id AND fk_project_id = ${projectId}::uuid
            ),
            direct_outgoing_count = (
                SELECT COUNT(*) FROM task_link 
                WHERE source_task_id = project_task.id AND fk_project_id = ${projectId}::uuid
            ),
            total_incoming_count = (
                SELECT COUNT(*) FROM task_reachability 
                WHERE descendant_task_id = project_task.id AND fk_project_id = ${projectId}::uuid
            ),
            total_outgoing_count = (
                SELECT COUNT(*) FROM task_reachability 
                WHERE ancestor_task_id = project_task.id AND fk_project_id = ${projectId}::uuid
            )
        WHERE fk_project_id = ${projectId}::uuid
    `.execute(trx);
};

/**
 * Closure Table Contraction: Removes paths that potentially relied on
 * the bridge 'sourceId -> targetId' and repairs the graph.
 */
export const contractTaskReachability = async (
    trx: Transaction<Database>,
    projectId: string,
    sourceId: string,
    targetId: string,
): Promise<void> => {
    // 1. Identify and Purge potentially broken paths
    await sql`
        DELETE FROM task_reachability
        WHERE fk_project_id = ${projectId}::uuid
          AND ancestor_task_id IN (
              SELECT ancestor_task_id FROM task_reachability WHERE descendant_task_id = ${sourceId}::uuid AND fk_project_id = ${projectId}::uuid
              UNION ALL SELECT ${sourceId}::uuid
          )
          AND descendant_task_id IN (
              SELECT descendant_task_id FROM task_reachability WHERE ancestor_task_id = ${targetId}::uuid AND fk_project_id = ${projectId}::uuid
              UNION ALL SELECT ${targetId}::uuid
          )
    `.execute(trx);

    // 2. Recursive Repair
    await sql`
        WITH RECURSIVE repair AS (
            SELECT 
                fk_project_id,
                source_task_id as anc_id,
                target_task_id as des_id,
                1 as depth
            FROM task_link
            WHERE fk_project_id = ${projectId}::uuid
            
            UNION
            
            SELECT 
                tl.fk_project_id,
                r.anc_id,
                tl.target_task_id,
                r.depth + 1
            FROM repair r
            JOIN task_link tl ON tl.source_task_id = r.des_id
            WHERE tl.fk_project_id = ${projectId}::uuid
              AND r.depth < 100
        )
        INSERT INTO task_reachability (fk_project_id, ancestor_task_id, descendant_task_id, depth)
        SELECT fk_project_id, anc_id, des_id, MIN(depth)
        FROM repair
        GROUP BY fk_project_id, anc_id, des_id
        ON CONFLICT (fk_project_id, ancestor_task_id, descendant_task_id) 
        DO UPDATE SET depth = EXCLUDED.depth
    `.execute(trx);
};

/**
 * Bulk Reachability Deletion: Handles the removal of multiple tasks
 * and repairs the graph transitive closure.
 */
/**
 * Chunked purge of reachability rows for specific deleted tasks.
 *
 * Deletes at most BULK_DELETE_CHUNK_SIZE rows per call and returns:
 * - affectedCount: rows deleted this chunk
 * - affectedProjectIds: distinct projects touched (used to scope repair)
 *
 * Uses ctid for the subquery because task_reachability has a composite PK
 * and no surrogate id column.
 *
 * IMPORTANT: The caller must run the repair CTE only after the FINAL chunk
 * (i.e., when affectedCount < BULK_DELETE_CHUNK_SIZE). Running it on every
 * chunk would be N expensive CTEs for no gain — the purge is not complete yet.
 */
export const deleteTaskReachabilityChunk = async (
    trx: Transaction<Database>,
    taskIds: string[],
): Promise<{ affectedCount: number; affectedProjectIds: string[] }> => {
    if (taskIds.length === 0)
        return { affectedCount: 0, affectedProjectIds: [] };

    const result = await sql<{ fk_project_id: string }>`
        DELETE FROM task_reachability
        WHERE ctid IN (
            SELECT ctid FROM task_reachability
            WHERE ancestor_task_id = ANY(${taskIds}::uuid[])
               OR descendant_task_id = ANY(${taskIds}::uuid[])
            LIMIT ${BULK_DELETE_CHUNK_SIZE}
        )
        RETURNING fk_project_id
    `.execute(trx);

    const affectedProjectIds = [
        ...new Set(result.rows.map((r) => r.fk_project_id)),
    ];
    return { affectedCount: result.rows.length, affectedProjectIds };
};

/**
 * Full transitive closure repair for a set of projects.
 *
 * Called only once — after the FINAL deletion chunk — to rebuild all
 * reachability paths that may have been broken by the removed tasks.
 * Scoped to `projectIds` so it does not lock unrelated projects.
 */
export const repairTaskReachabilityForProjects = async (
    trx: Transaction<Database>,
    projectIds: string[],
): Promise<void> => {
    for (const projectId of projectIds) {
        await sql`
            WITH RECURSIVE repair AS (
                SELECT 
                    fk_project_id,
                    source_task_id as anc_id,
                    target_task_id as des_id,
                    1 as depth
                FROM task_link
                WHERE fk_project_id = ${projectId}::uuid

                UNION

                SELECT 
                    tl.fk_project_id,
                    r.anc_id,
                    tl.target_task_id,
                    r.depth + 1
                FROM repair r
                JOIN task_link tl ON tl.source_task_id = r.des_id
                WHERE tl.fk_project_id = ${projectId}::uuid
                  AND r.depth < 100
            )
            INSERT INTO task_reachability (fk_project_id, ancestor_task_id, descendant_task_id, depth)
            SELECT fk_project_id, anc_id, des_id, MIN(depth)
            FROM repair
            GROUP BY fk_project_id, anc_id, des_id
            ON CONFLICT (fk_project_id, ancestor_task_id, descendant_task_id)
            DO UPDATE SET depth = EXCLUDED.depth
        `.execute(trx);

        await syncTaskGraphCounters(trx, projectId);
    }
};

/**
 * Fetches a minimal task row for the auto-action context resolver.
 * Includes all prev_ columns needed by TaskContextRow.
 * Internal-only — no permission check.
 */
export async function getTaskContextById(
    taskId: string,
): Promise<TaskContextRow | undefined> {
    return db
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
            'prev_status',
            'prev_priority',
            'prev_title',
            'prev_team_id',
            'prev_member_id',
        ])
        .where('id', '=', taskId as any)
        .executeTakeFirst();
}
