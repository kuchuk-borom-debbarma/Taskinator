import { sql } from 'kysely';
import { db } from '../../../../database/index.js';
import type {
    AutoAction,
    NewAutoAction,
} from '../../../../database/tables/AutoAction.js';
import type { PaginationParams } from '../../../../types/pagination.ts';
import { decodeCursor, encodeCursor } from '../../../../utils/utils.ts';

/**
 * Raw Kysely DB queries for the auto_action table.
 * Zero business logic — all validation and orchestration lives in AutoActionServiceImpl.
 */

export async function insertAutoAction(
    data: NewAutoAction,
): Promise<AutoAction> {
    return db
        .insertInto('auto_action')
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();
}

export async function selectAutoActionById(
    id: string,
): Promise<AutoAction | undefined> {
    return db
        .selectFrom('auto_action')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
}

export async function selectAutoActionForExecution(
    id: string,
): Promise<AutoAction | undefined> {
    return selectAutoActionById(id);
}

export async function selectAutoActionsByIds(
    ids: string[],
): Promise<AutoAction[]> {
    if (ids.length === 0) return [];

    return db
        .selectFrom('auto_action')
        .selectAll()
        .where('id', 'in', ids)
        .execute();
}

export async function updateAutoActionById(
    id: string,
    patch: Record<string, any>,
    expectedVersion: number,
): Promise<AutoAction> {
    const updated = await db
        .updateTable('auto_action')
        .set(patch)
        .where('id', '=', id)
        .where('version', '=', expectedVersion)
        .returningAll()
        .executeTakeFirst();

    if (!updated) {
        throw new Error(
            `Failed to update Auto Action "${id}". Potential concurrent update.`,
        );
    }

    return updated;
}

export async function deleteAutoActionById(id: string): Promise<void> {
    await db.deleteFrom('auto_action').where('id', '=', id).execute();
}

export async function selectAutoActionsForProject(
    projectId: string,
): Promise<AutoAction[]> {
    return db
        .selectFrom('auto_action')
        .selectAll()
        .where('fk_project_id', '=', projectId)
        .orderBy('created_at', 'asc')
        .execute();
}

export async function selectAutoActionsForProjectPage(
    projectId: string,
    params: PaginationParams = {},
): Promise<{
    autoActions: AutoAction[];
    totalCount: number;
    nextCursor: string | null;
    prevCursor: string | null;
}> {
    const limit = Math.min(params.first || params.last || 10, 50);
    const { first, last, after, before } = params;
    const isBackward = !!last || !!before;
    const cursor = before || after;

    let cursorEpoch: string | null = null;
    let cursorId: string | null = null;

    if (cursor) {
        const decoded = decodeCursor(cursor);
        cursorEpoch = decoded.timeValue;
        cursorId = decoded.id;
    }

    const countResult = await sql<{ count: string }>`
        SELECT count(*)::text as count
        FROM auto_action
        WHERE fk_project_id = ${projectId}::uuid
    `.execute(db);
    const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);

    const result = await sql<AutoAction & { epochPrecision: string }>`
        SELECT 
            id,
            fk_project_id,
            name,
            description,
            triggers,
            steps,
            is_active,
            is_sync,
            version,
            created_at,
            created_at::text as "epochPrecision",
            updated_at,
            created_by,
            updated_by
        FROM auto_action
        WHERE fk_project_id = ${projectId}::uuid
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

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (rows.length > 0) {
        const firstRow = rows[0]!;
        const lastRow = rows[rows.length - 1]!;

        if (last || before) {
            nextCursor = encodeCursor(lastRow.epochPrecision, lastRow.id);
            prevCursor = hasMore
                ? encodeCursor(firstRow.epochPrecision, firstRow.id)
                : null;
        } else {
            nextCursor = hasMore
                ? encodeCursor(lastRow.epochPrecision, lastRow.id)
                : null;
            prevCursor = after
                ? encodeCursor(firstRow.epochPrecision, firstRow.id)
                : null;
        }
    }

    return {
        autoActions: rows,
        totalCount,
        nextCursor,
        prevCursor,
    };
}

export async function selectActiveAutoActionsForProject(
    projectId: string,
): Promise<AutoAction[]> {
    return db
        .selectFrom('auto_action')
        .selectAll()
        .where('fk_project_id', '=', projectId)
        .where('is_active', '=', true)
        .orderBy('created_at', 'asc')
        .execute();
}

export async function selectActiveAutoActionByName(
    projectId: string,
    name: string,
    excludeId?: string,
): Promise<AutoAction | undefined> {
    let query = db
        .selectFrom('auto_action')
        .selectAll()
        .where('fk_project_id', '=', projectId)
        .where('name', '=', name)
        .where('is_active', '=', true);

    if (excludeId) {
        query = query.where('id', '!=', excludeId);
    }

    return query.executeTakeFirst();
}
