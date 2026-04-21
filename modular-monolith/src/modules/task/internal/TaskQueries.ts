import type {
    GetNeighbourhoodParam,
    NeighbourRecord,
    PaginationParams,
    Task,
    TaskLink,
    TaskNeighbourhoodResult,
} from '../TaskService.ts';
import { db } from '../../../database';
import { decodeCursor, encodeCursor } from '../../../utils/utils.ts';
import { sql } from 'kysely';
import { NotFoundError, ConflictError } from '../../../graphql/errors.ts';

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
            last_event_id AS "lastEventId",
            fk_created_by AS "createdBy",
            fk_updated_by AS "updatedBy",
            priority,
            created_at AS "createdAt",
            created_at::text as "epochPrecision",
            updated_at AS "updatedAt"
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
            last_event_id AS "lastEventId",
            fk_created_by AS "createdBy",
            fk_updated_by AS "updatedBy",
            priority,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
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
            last_event_id AS "lastEventId",
            fk_created_by AS "createdBy",
            fk_updated_by AS "updatedBy",
            priority,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        FROM project_task
        WHERE id = ANY(${ids}::uuid[])
          AND EXISTS (
              SELECT 1 FROM project p 
              LEFT JOIN project_member pm ON pm.fk_project_id = p.id
              WHERE p.id = project_task.fk_project_id
                AND (p.fk_user_id = ${userId}::text OR pm.fk_user_id = ${userId}::text)
          )
    `.execute(db);

    return result.rows;
};

export const getTaskLinksPage = async (
    userId: string,
    projectId: string,
    taskId: string,
    direction: 'incoming' | 'outgoing',
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
            fk_source_task_id AS "sourceTaskId", 
            fk_target_task_id AS "targetTaskId", 
            label, 
            fk_created_by AS "createdBy", 
            created_at AS "createdAt",
            created_at::text as "epochPrecision"
        FROM project_task_link
        WHERE EXISTS (SELECT 1 FROM auth_check)
          AND fk_project_id = ${projectId}::uuid
          AND (
            CASE 
              WHEN ${direction} = 'incoming' THEN fk_target_task_id = ${taskId}::uuid
              ELSE fk_source_task_id = ${taskId}::uuid
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
            fk_source_task_id AS "sourceTaskId", 
            fk_target_task_id AS "targetTaskId", 
            label, 
            fk_created_by AS "createdBy", 
            created_at AS "createdAt",
            created_at::text as "epochPrecision"
        FROM project_task_link
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
}): Promise<Task> => {
    const result = await sql<Task>`
        WITH authorized AS (
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            LIMIT 1
        ),
        inserted_task AS (
            INSERT INTO project_task (
                fk_project_id, 
                title, 
                description, 
                status, 
                fk_created_by, 
                fk_updated_by
            )
            SELECT 
                ${param.projectId}::uuid, 
                ${param.title}, 
                ${param.description ?? ''}, 
                ${param.status ?? 'TODO'}, 
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
                last_event_id AS "lastEventId",
                fk_created_by AS "createdBy", 
                fk_updated_by AS "updatedBy",
                priority, 
                created_at AS "createdAt", 
                updated_at AS "updatedAt"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'task.created',
                id::text,
                jsonb_build_object(
                    'taskId', id,
                    'projectId', projectId,
                    'title', title,
                    'actorId', ${param.actorId}
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
}): Promise<Task> => {
    // 1. Build dynamic SET fragments
    const updates: any[] = [];
    if (param.title !== undefined) updates.push(sql`title = ${param.title}`);
    if (param.description !== undefined)
        updates.push(sql`description = ${param.description ?? ''}`);
    if (param.status !== undefined)
        updates.push(sql`status = ${param.status ?? 'TODO'}`);

    // Assignment updates
    if (param.teamId !== undefined)
        updates.push(sql`fk_team_id = ${param.teamId}::uuid`);
    if (param.memberId !== undefined)
        updates.push(sql`fk_member_id = ${param.memberId}::text`);

    if (updates.length === 0) {
        // No updates, just fetch and return current state (or maybe we should require version check anyway?)
        // To be safe and check optimistic lock, we'll still run a dummy update or just fetch.
        // But the requirement usually implies something changed.
    }

    updates.push(sql`version = version + 1`);
    updates.push(sql`fk_updated_by = ${param.actorId}`);
    updates.push(sql`updated_at = NOW()`);

    const setClause = sql.join(updates, sql`, `);

    const result = await sql<Task>`
        WITH current_state AS (
            SELECT id, fk_project_id, fk_team_id, fk_member_id, title, status, version
            FROM project_task
            WHERE id = ${param.taskId}::uuid AND fk_project_id = ${param.projectId}::uuid
            FOR UPDATE
        ),
        authorized AS (
            -- Actor must be project owner or member
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            LIMIT 1
        ),
        validation AS (
            SELECT 1
            WHERE (
                -- If teamId is provided, it must belong to the project
                ${param.teamId}::uuid IS NULL OR EXISTS (
                    SELECT 1 FROM project_team WHERE id = ${param.teamId}::uuid AND fk_project_id = ${param.projectId}::uuid
                )
            ) AND (
                -- If memberId is provided, they must be a project member
                ${param.memberId}::text IS NULL OR EXISTS (
                    SELECT 1 FROM project_member WHERE fk_user_id = ${param.memberId}::text AND fk_project_id = ${param.projectId}::uuid
                )
            ) AND (
                -- If both provided, member must be in the team
                ((${param.teamId}::uuid IS NULL) OR (${param.memberId}::text IS NULL)) OR EXISTS (
                    SELECT 1 FROM project_team_member WHERE fk_team_id = ${param.teamId}::uuid AND fk_user_id = ${param.memberId}::text
                )
            )
        ),
        updated_task AS (
            UPDATE project_task SET ${setClause}
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
                last_event_id AS "lastEventId",
                fk_created_by AS "createdBy", 
                fk_updated_by AS "updatedBy",
                priority, 
                created_at AS "createdAt", 
                updated_at AS "updatedAt"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'task.updated',
                u.id::text,
                jsonb_build_object(
                    'taskId', u.id,
                    'projectId', u."projectId",
                    'old', jsonb_build_object(
                        'teamId', c.fk_team_id,
                        'memberId', c.fk_member_id,
                        'title', c.title,
                        'status', c.status
                    ),
                    'new', jsonb_build_object(
                        'teamId', u."teamId",
                        'memberId', u."memberId",
                        'title', u.title,
                        'status', u.status
                    ),
                    'actorId', ${param.actorId}
                )
            FROM updated_task u
            CROSS JOIN current_state c
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
            -- Actor must be project owner or member
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            LIMIT 1
        ),
        deleted_task AS (
            DELETE FROM project_task
            WHERE id = ${param.taskId}::uuid
              AND fk_project_id = ${param.projectId}::uuid
              AND EXISTS (SELECT 1 FROM authorized)
            RETURNING id, fk_project_id AS "projectId", fk_team_id AS "teamId"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'task.deleted',
                id::text,
                jsonb_build_object(
                    'taskId', id,
                    'projectId', projectId,
                    'teamId', "teamId",
                    'actorId', ${param.actorId}
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
            -- Actor must be project owner or member
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
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
            SELECT ${param.projectId}::uuid, ${param.sourceTaskId}::uuid, ${param.targetTaskId}::uuid, ${param.label}, ${param.actorId}
            WHERE EXISTS (SELECT 1 FROM authorized)
              AND EXISTS (SELECT 1 FROM validation)
            RETURNING 
                id, 
                fk_project_id AS "projectId", 
                source_task_id AS "sourceTaskId", 
                target_task_id AS "targetTaskId", 
                label, 
                created_by AS "createdBy", 
                created_at AS "createdAt"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'task_link.created',
                id::text,
                jsonb_build_object(
                    'linkId', id,
                    'projectId', projectId,
                    'sourceTaskId', sourceTaskId,
                    'targetTaskId', targetTaskId,
                    'label', label,
                    'actorId', ${param.actorId}
                )
            FROM inserted_link
        )
        SELECT * FROM inserted_link
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
            -- Actor must be project owner or member
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            LIMIT 1
        ),
        deleted_link AS (
            DELETE FROM task_link
            WHERE id = ${param.linkId}::uuid
              AND fk_project_id = ${param.projectId}::uuid
              AND EXISTS (SELECT 1 FROM authorized)
            RETURNING id, fk_project_id AS "projectId"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'task_link.deleted',
                id::text,
                jsonb_build_object(
                    'linkId', id,
                    'projectId', projectId,
                    'actorId', ${param.actorId}
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
            -- Actor must be project owner or member
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
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
                fk_project_id AS "projectId", 
                source_task_id AS "sourceTaskId", 
                target_task_id AS "targetTaskId", 
                label, 
                created_by AS "createdBy", 
                created_at AS "createdAt"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'task_link.updated',
                id::text,
                jsonb_build_object(
                    'linkId', id,
                    'projectId', projectId,
                    'sourceTaskId', sourceTaskId,
                    'targetTaskId', targetTaskId,
                    'label', label,
                    'actorId', ${param.actorId}
                )
            FROM updated_link
        )
        SELECT * FROM updated_link
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
        DELETE FROM project_task_link
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
            fk_team_id = NULL,
            fk_member_id = NULL,
            updated_at = NOW()
        WHERE fk_team_id = ANY(${teamIds}::uuid[])
        RETURNING id
    `.execute(db);

    return { updatedCount: result.rows.length };
};

export const unassignMembersFromProjectTasks = async (
    projectId: string,
    userIds: string[],
): Promise<{ updatedCount: number }> => {
    if (userIds.length === 0) return { updatedCount: 0 };

    const result = await sql<{ id: string }>`
        UPDATE project_task
        SET 
            fk_member_id = NULL,
            updated_at = NOW()
        WHERE fk_project_id = ${projectId}::uuid
          AND fk_member_id = ANY(${userIds}::text[])
        RETURNING id
    `.execute(db);

    return { updatedCount: result.rows.length };
};

export const unassignTeamMembersFromTasks = async (
    teamId: string,
    userIds: string[],
): Promise<{ updatedCount: number }> => {
    if (userIds.length === 0) return { updatedCount: 0 };

    const result = await sql<{ id: string }>`
        UPDATE project_task
        SET 
            fk_member_id = NULL,
            updated_at = NOW()
        WHERE fk_team_id = ${teamId}::uuid
          AND fk_member_id = ANY(${userIds}::text[])
        RETURNING id
    `.execute(db);

    return { updatedCount: result.rows.length };
};

export const deleteTaskLinksByTaskIds = async (
    taskIds: string[],
): Promise<void> => {
    if (taskIds.length === 0) return;
    await sql`
        DELETE FROM task_link 
        WHERE source_task_id = ANY(${taskIds}::uuid[]) 
           OR target_task_id = ANY(${taskIds}::uuid[])
    `.execute(db);
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
