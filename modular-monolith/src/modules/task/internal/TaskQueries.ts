import { db } from '../../../database';
import { sql } from 'kysely';
import type {
    CreateLinkParam,
    CreateTaskParam,
    UpdateTaskParam,
    GetNeighbourhoodParam,
    NeighbourRecord,
    PaginationParams,
    ProjectTask,
    TaskLink,
    TaskNeighbourhoodResult,
} from '../TaskService.ts';
import { getTimeString } from '../../../utils/utils.ts';

export const insertTask = async (data: CreateTaskParam): Promise<ProjectTask> => {
    const result = await sql<ProjectTask>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            LIMIT 1
        ),
        inserted_task AS (
            INSERT INTO project_task (
                fk_project_id, fk_team_id, fk_member_id, title, description, status, created_by, updated_by
            )
            SELECT 
                ${data.projectId}::uuid, 
                ${data.teamId || null}::uuid, 
                ${data.memberId || null}, 
                ${data.title}, 
                ${data.description || ''}, 
                ${data.status || 'TODO'}, 
                ${data.userId}, 
                ${data.userId}
            WHERE EXISTS (SELECT 1 FROM auth_check)
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

    const task = result.rows[0];
    if (!task) throw new Error('Unauthorized or failed to create task');
    return task;
};

export const insertLink = async (data: CreateLinkParam): Promise<TaskLink> => {
    const result = await sql<TaskLink>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            LIMIT 1
        ),
        cycle_check AS (
            SELECT 1 FROM task_reachability 
            WHERE fk_project_id = ${data.projectId}::uuid 
              AND ancestor_task_id = ${data.targetTaskId}::uuid 
              AND descendant_task_id = ${data.sourceTaskId}::uuid
            LIMIT 1
        ),
        inserted_link AS (
            INSERT INTO task_link (fk_project_id, source_task_id, target_task_id, label, created_by)
            SELECT 
                ${data.projectId}::uuid, 
                ${data.sourceTaskId}::uuid, 
                ${data.targetTaskId}::uuid, 
                ${data.label}, 
                ${data.userId}
            WHERE EXISTS (SELECT 1 FROM auth_check)
              AND NOT EXISTS (SELECT 1 FROM cycle_check)
            RETURNING *
        ),
        updated_reachability AS (
            INSERT INTO task_reachability (fk_project_id, ancestor_task_id, descendant_task_id, min_depth, path_count)
            -- 1. The link itself
            SELECT fk_project_id, source_task_id, target_task_id, 1, 1
            FROM inserted_link
            UNION ALL
            -- 2. Ancestors of source to target
            SELECT fk_project_id, ancestor_task_id, ${data.targetTaskId}::uuid, min_depth + 1, path_count
            FROM task_reachability
            WHERE descendant_task_id = ${data.sourceTaskId}::uuid 
              AND fk_project_id = ${data.projectId}::uuid
            UNION ALL
            -- 3. Source to descendants of target
            SELECT fk_project_id, ${data.sourceTaskId}::uuid, descendant_task_id, min_depth + 1, path_count
            FROM task_reachability
            WHERE ancestor_task_id = ${data.targetTaskId}::uuid 
              AND fk_project_id = ${data.projectId}::uuid
            UNION ALL
            -- 4. Ancestors of source to descendants of target
            SELECT rA.fk_project_id, rA.ancestor_task_id, rB.descendant_task_id, rA.min_depth + rB.min_depth + 1, rA.path_count * rB.path_count
            FROM task_reachability rA, task_reachability rB
            WHERE rA.descendant_task_id = ${data.sourceTaskId}::uuid 
              AND rB.ancestor_task_id = ${data.targetTaskId}::uuid
              AND rA.fk_project_id = ${data.projectId}::uuid 
              AND rB.fk_project_id = ${data.projectId}::uuid
            ON CONFLICT (fk_project_id, ancestor_task_id, descendant_task_id) DO UPDATE SET
                min_depth = LEAST(task_reachability.min_depth, EXCLUDED.min_depth),
                path_count = task_reachability.path_count + EXCLUDED.path_count
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.task_link.created',
                   id::text,
                   jsonb_build_object(
                       'linkId', id,
                       'projectId', fk_project_id,
                       'sourceTaskId', source_task_id,
                       'targetTaskId', target_task_id,
                       'label', label,
                       'userId', created_by
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
        // Distinguish between cycle and unauthorized
        const isCycle = await sql`
             SELECT 1 FROM task_reachability 
             WHERE fk_project_id = ${data.projectId}::uuid 
               AND ancestor_task_id = ${data.targetTaskId}::uuid 
               AND descendant_task_id = ${data.sourceTaskId}::uuid
        `.execute(db);
        if (isCycle.rows.length > 0) throw new Error('Cycle detected');
        throw new Error('Unauthorized or failed to create link');
    }
    return link;
};

export const deleteTaskQuery = async (userId: string, taskId: string): Promise<void> => {
    await sql`
        WITH auth_check AS (
            SELECT p.id FROM project_task t
            JOIN project p ON t.fk_project_id = p.id
            LEFT JOIN project_member pm ON pm.fk_project_id = p.id
            WHERE t.id = ${taskId}::uuid AND (p.fk_user_id = ${userId} OR pm.fk_user_id = ${userId})
            LIMIT 1
        ),
        links_being_pruned AS (
            SELECT id, fk_project_id, source_task_id, target_task_id 
            FROM task_link 
            WHERE (source_task_id = ${taskId}::uuid OR target_task_id = ${taskId}::uuid)
              AND EXISTS (SELECT 1 FROM auth_check)
        ),
        deleted_task AS (
            DELETE FROM project_task
            WHERE id = ${taskId}::uuid
              AND EXISTS (SELECT 1 FROM auth_check)
            RETURNING *
        ),
        -- Emit link deletion events first to trigger reachability cleanup
        inserted_link_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.task_link.deleted',
                   id::text,
                   jsonb_build_object(
                       'linkId', id,
                       'projectId', fk_project_id,
                       'sourceTaskId', source_task_id,
                       'targetTaskId', target_task_id,
                       'userId', ${userId}
                   )
            FROM links_being_pruned
        ),
        inserted_task_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.task.deleted',
                   id::text,
                   jsonb_build_object(
                       'taskId', id,
                       'projectId', fk_project_id,
                       'userId', ${userId}
                   )
            FROM deleted_task
        )
        SELECT 1 FROM deleted_task
    `.execute(db);
};

export const deleteLinkQuery = async (userId: string, linkId: string): Promise<void> => {
    await sql`
        WITH auth_check AS (
            SELECT p.id FROM task_link l
            JOIN project p ON l.fk_project_id = p.id
            LEFT JOIN project_member pm ON pm.fk_project_id = p.id
            WHERE l.id = ${linkId}::uuid AND (p.fk_user_id = ${userId} OR pm.fk_user_id = ${userId})
            LIMIT 1
        ),
        deleted_link AS (
            DELETE FROM task_link
            WHERE id = ${linkId}::uuid
              AND EXISTS (SELECT 1 FROM auth_check)
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.task_link.deleted',
                   id::text,
                   jsonb_build_object(
                       'linkId', id,
                       'projectId', fk_project_id,
                       'sourceTaskId', source_task_id,
                       'targetTaskId', target_task_id,
                       'userId', ${userId}
                   )
            FROM deleted_link
        )
        SELECT 1 FROM deleted_link
    `.execute(db);
};

export const decrementLinkReachability = async (params: {
    projectId: string;
    sourceTaskId: string;
    targetTaskId: string;
}): Promise<void> => {
    await db.transaction().execute(async (trx) => {
        // 1. Decrement path counts for all affected transitive pairs
        await sql`
            WITH ancestors AS (
                SELECT ancestor_task_id as id, path_count FROM task_reachability 
                WHERE descendant_task_id = ${params.sourceTaskId}::uuid 
                  AND fk_project_id = ${params.projectId}::uuid
                UNION ALL
                SELECT ${params.sourceTaskId}::uuid as id, 1 as path_count
            ),
            descendants AS (
                SELECT descendant_task_id as id, path_count FROM task_reachability 
                WHERE ancestor_task_id = ${params.targetTaskId}::uuid 
                  AND fk_project_id = ${params.projectId}::uuid
                UNION ALL
                SELECT ${params.targetTaskId}::uuid as id, 1 as path_count
            ),
            to_decrement AS (
                SELECT a.id as anc, d.id as desc, (a.path_count * d.path_count) as amount
                FROM ancestors a, descendants d
            )
            UPDATE task_reachability tr
            SET path_count = tr.path_count - td.amount
            FROM to_decrement td
            WHERE tr.fk_project_id = ${params.projectId}::uuid
              AND tr.ancestor_task_id = td.anc
              AND tr.descendant_task_id = td.desc
        `.execute(trx);

        // 2. Remove rows where path_count is zero or negative (partition key as safety)
        await sql`
            DELETE FROM task_reachability 
            WHERE path_count <= 0 
              AND fk_project_id = ${params.projectId}::uuid
        `.execute(trx);
    });
};

export const getTasksPage = async (
    userId: string,
    projectId: string,
    params: PaginationParams,
): Promise<{ tasks: ProjectTask[]; nextCursor: string | null; prevCursor: string | null }> => {
    const limit = Math.min(params.first || params.last || 10, 50);
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
          AND EXISTS (SELECT 1 FROM auth_check)
          AND (
            ${cursorDate}::timestamptz IS NULL 
            OR (
                CASE 
                  WHEN ${isBackward} THEN (created_at > ${cursorDate}::timestamptz OR (created_at = ${cursorDate}::timestamptz AND id > ${cursorId}::uuid))
                  ELSE (created_at < ${cursorDate}::timestamptz OR (created_at = ${cursorDate}::timestamptz AND id < ${cursorId}::uuid))
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

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (rows.length > 0) {
        const first = rows[0]!;
        const last = rows[rows.length - 1]!;
        const firstDateStr = first.createdAt instanceof Date ? first.createdAt.toISOString() : first.createdAt;
        const lastDateStr = last.createdAt instanceof Date ? last.createdAt.toISOString() : last.createdAt;

        if (isBackward) {
            nextCursor = hasMore ? `${firstDateStr}|${first.id}` : null;
            prevCursor = `${lastDateStr}|${last.id}`;
        } else {
            nextCursor = hasMore ? `${lastDateStr}|${last.id}` : null;
            prevCursor = after ? `${firstDateStr}|${first.id}` : null;
        }
    }

    return { tasks: rows, nextCursor, prevCursor };
};

export const getTasksByIds = async (
    userId: string,
    ids: string[],
): Promise<ProjectTask[]> => {
    if (ids.length === 0) return [];
    
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
        FROM project_task t
        WHERE id = ANY(${ids}::uuid[])
          AND (
            EXISTS (SELECT 1 FROM project p WHERE p.id = t.fk_project_id AND p.fk_user_id = ${userId}::text)
            OR EXISTS (SELECT 1 FROM project_member pm WHERE pm.fk_project_id = t.fk_project_id AND pm.fk_user_id = ${userId}::text)
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
): Promise<{ links: TaskLink[]; nextCursor: string | null; prevCursor: string | null }> => {
    const limit = Math.min(params.first || params.last || 20, 50);
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

    // incoming: links pointing TO this task (target_task_id = taskId)
    // outgoing: links pointing FROM this task (source_task_id = taskId)
    const filterCol = direction === 'incoming' ? 'target_task_id' : 'source_task_id';

    const result = await sql<TaskLink>`
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
            created_at AS "createdAt"
        FROM task_link
        WHERE fk_project_id = ${projectId}::uuid
          AND ${sql.raw(filterCol)} = ${taskId}::uuid
          AND EXISTS (SELECT 1 FROM auth_check)
          AND (
            ${cursorDate}::timestamptz IS NULL
            OR (
                CASE
                  WHEN ${isBackward} THEN (created_at > ${cursorDate}::timestamptz OR (created_at = ${cursorDate}::timestamptz AND id > ${cursorId}::uuid))
                  ELSE (created_at < ${cursorDate}::timestamptz OR (created_at = ${cursorDate}::timestamptz AND id < ${cursorId}::uuid))
                END
            )
          )
        ORDER BY created_at ${sql.raw(isBackward ? 'ASC' : 'DESC')}, id ${sql.raw(isBackward ? 'ASC' : 'DESC')}
        LIMIT ${limit + 1}
    `.execute(db);

    let rows = result.rows;
    const hasMore = rows.length > limit;
    if (hasMore) rows = rows.slice(0, limit);
    if (isBackward) rows.reverse();

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (rows.length > 0) {
        const first = rows[0]!;
        const last = rows[rows.length - 1]!;
        const firstDateStr = first.createdAt instanceof Date ? first.createdAt.toISOString() : first.createdAt;
        const lastDateStr = last.createdAt instanceof Date ? last.createdAt.toISOString() : last.createdAt;

        if (isBackward) {
            nextCursor = hasMore ? `${firstDateStr}|${first.id}` : null;
            prevCursor = `${lastDateStr}|${last.id}`;
        } else {
            nextCursor = hasMore ? `${lastDateStr}|${last.id}` : null;
            prevCursor = after ? `${firstDateStr}|${first.id}` : null;
        }
    }

    return { links: rows, nextCursor, prevCursor };
};

export const getNeighbourhood = async (
    params: GetNeighbourhoodParam,
): Promise<TaskNeighbourhoodResult> => {
    const maxDepth = Math.min(params.maxDepth ?? 3, 5);
    const limit = Math.min(params.first || params.last || 20, 50);
    const isBackward = !!params.before;
    const cursor = params.before || params.after;

    let cursorDepth: number | null = null;
    let cursorId: string | null = null;

    if (cursor && cursor.includes('|')) {
        const parts = cursor.split('|');
        if (parts.length === 2) {
            cursorDepth = parseInt(parts[0]!, 10);
            cursorId = parts[1]!;
        }
    }

    // ── Step 1: Paginate neighbours from task_reachability ──────────────────
    // Union incoming ancestors + outgoing descendants, deduplicate by choosing
    // MIN depth and marking as 'both' if the same task appears on both sides.
    type ReachRow = { neighbour_id: string; min_depth: number; direction: string };

    const reachResult = await sql<ReachRow>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${params.projectId}::uuid AND fk_user_id = ${params.userId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${params.projectId}::uuid AND fk_user_id = ${params.userId}::text
            LIMIT 1
        ),
        incoming AS (
            SELECT ancestor_task_id AS neighbour_id, min_depth, 'incoming' AS direction
            FROM task_reachability
            WHERE fk_project_id = ${params.projectId}::uuid
              AND descendant_task_id = ${params.taskId}::uuid
              AND min_depth <= ${maxDepth}
              AND EXISTS (SELECT 1 FROM auth_check)
        ),
        outgoing AS (
            SELECT descendant_task_id AS neighbour_id, min_depth, 'outgoing' AS direction
            FROM task_reachability
            WHERE fk_project_id = ${params.projectId}::uuid
              AND ancestor_task_id = ${params.taskId}::uuid
              AND min_depth <= ${maxDepth}
              AND EXISTS (SELECT 1 FROM auth_check)
        ),
        neighbourhood AS (
            SELECT neighbour_id, min_depth, direction FROM incoming
            UNION ALL
            SELECT neighbour_id, min_depth, direction FROM outgoing
        ),
        deduped AS (
            SELECT
                neighbour_id,
                MIN(min_depth) AS min_depth,
                CASE WHEN COUNT(DISTINCT direction) > 1 THEN 'both' ELSE MIN(direction) END AS direction
            FROM neighbourhood
            GROUP BY neighbour_id
        )
        SELECT neighbour_id, min_depth, direction
        FROM deduped
        WHERE (
            ${cursorDepth}::int IS NULL
            OR (
                CASE
                  WHEN ${isBackward} THEN
                    (min_depth < ${cursorDepth}::int OR (min_depth = ${cursorDepth}::int AND neighbour_id < ${cursorId}::uuid))
                  ELSE
                    (min_depth > ${cursorDepth}::int OR (min_depth = ${cursorDepth}::int AND neighbour_id > ${cursorId}::uuid))
                END
            )
        )
        ORDER BY min_depth ${sql.raw(isBackward ? 'DESC' : 'ASC')}, neighbour_id ${sql.raw(isBackward ? 'DESC' : 'ASC')}
        LIMIT ${limit + 1}
    `.execute(db);

    let reachRows = reachResult.rows;
    const hasMore = reachRows.length > limit;
    if (hasMore) reachRows = reachRows.slice(0, limit);
    if (isBackward) reachRows.reverse();

    // Build cursor from the page
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (reachRows.length > 0) {
        const first = reachRows[0]!;
        const last = reachRows[reachRows.length - 1]!;

        if (isBackward) {
            nextCursor = hasMore ? `${first.min_depth}|${first.neighbour_id}` : null;
            prevCursor = `${last.min_depth}|${last.neighbour_id}`;
        } else {
            nextCursor = hasMore ? `${last.min_depth}|${last.neighbour_id}` : null;
            prevCursor = params.after ? `${first.min_depth}|${first.neighbour_id}` : null;
        }
    }

    const neighbours: NeighbourRecord[] = reachRows.map((r) => ({
        taskId: r.neighbour_id,
        depth: r.min_depth,
        direction: r.direction as NeighbourRecord['direction'],
    }));

    if (neighbours.length === 0) {
        return { neighbours: [], edges: [], nextCursor, prevCursor };
    }

    // ── Step 2: Fetch direct edges involving the current page nodes ─────────
    // To ensure consistency during 'Load More', we fetch links where at least 
    // one end is in our current nodeIds, and the other end is within the graph scope.
    const nodeIds = [params.taskId, ...neighbours.map((n) => n.taskId)];

    const edgeResult = await sql<TaskLink>`
        WITH reachable_ids AS (
            SELECT ancestor_task_id AS id FROM task_reachability 
            WHERE descendant_task_id = ${params.taskId}::uuid AND min_depth <= ${maxDepth}
            UNION
            SELECT descendant_task_id AS id FROM task_reachability 
            WHERE ancestor_task_id = ${params.taskId}::uuid AND min_depth <= ${maxDepth}
            UNION
            SELECT ${params.taskId}::uuid AS id
        )
        SELECT
            id,
            fk_project_id AS "projectId",
            source_task_id AS "sourceTaskId",
            target_task_id AS "targetTaskId",
            label,
            created_by AS "createdBy",
            created_at AS "createdAt"
        FROM task_link
        WHERE fk_project_id = ${params.projectId}::uuid
          AND (source_task_id = ANY(${nodeIds}::uuid[]) OR target_task_id = ANY(${nodeIds}::uuid[]))
          AND source_task_id IN (SELECT id FROM reachable_ids)
          AND target_task_id IN (SELECT id FROM reachable_ids)
    `.execute(db);

    return {
        neighbours,
        edges: edgeResult.rows,
        nextCursor,
        prevCursor,
    };
};

export const updateTaskQuery = async (data: UpdateTaskParam): Promise<ProjectTask> => {
    const result = await sql<ProjectTask>`
        WITH auth_check AS (
            SELECT p.id FROM project_task t
            JOIN project p ON t.fk_project_id = p.id
            LEFT JOIN project_member pm ON pm.fk_project_id = p.id
            WHERE t.id = ${data.taskId}::uuid AND (p.fk_user_id = ${data.userId} OR pm.fk_user_id = ${data.userId})
            LIMIT 1
        ),
        updated_task AS (
            UPDATE project_task
            SET 
                title = COALESCE(${data.title}, title),
                description = COALESCE(${data.description}, description),
                status = COALESCE(${data.status}, status),
                updated_by = ${data.userId},
                updated_at = NOW(),
                version = version + 1
            WHERE id = ${data.taskId}::uuid
              AND EXISTS (SELECT 1 FROM auth_check)
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.task.updated',
                   id::text,
                   jsonb_build_object(
                       'taskId', id,
                       'projectId', fk_project_id,
                       'userId', updated_by,
                       'title', title,
                       'status', status
                   )
            FROM updated_task
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
        FROM updated_task
    `.execute(db);

    const task = result.rows[0];
    if (!task) throw new Error('Unauthorized or failed to update task');
    return task;
};
