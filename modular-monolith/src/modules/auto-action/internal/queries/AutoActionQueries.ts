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

/**
 * Inserts a new AutoAction and its initial outbox signal in a single atomic database roundtrip.
 *
 * This uses a PostgreSQL CTE (Common Table Expression) to:
 * 1. Write to the 'auto_action' table.
 * 2. Immediately use the resulting ID to write to the 'outbox_events' table.
 *
 * This pattern ensures data consistency and high throughput by reducing roundtrips to exactly 1.
 */
export async function insertAutoAction(
    data: NewAutoAction,
): Promise<AutoAction> {
    const result = await sql<AutoAction>`
        WITH inserted_action AS (
            INSERT INTO auto_action (
                fk_project_id,
                name,
                description,
                triggers,
                steps,
                is_active,
                is_sync,
                version,
                created_by,
                updated_by
            )
            VALUES (
                ${data.fk_project_id}::uuid,
                ${data.name},
                ${data.description},
                ${data.triggers}::jsonb,
                ${data.steps}::jsonb,
                ${data.is_active},
                ${data.is_sync},
                ${data.version},
                ${data.created_by},
                ${data.updated_by}
            )
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT
                'auto-action-events',
                fk_project_id::text,
                jsonb_build_object(
                    'type', 'auto_action.created',
                    'autoActionId', id,
                    'projectId', fk_project_id,
                    'name', name,
                    'isActive', is_active,
                    'isSync', is_sync,
                    'actorId', created_by
                )
            FROM inserted_action
        )
        SELECT * FROM inserted_action
    `.execute(db);

    return result.rows[0]!;
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
    const updates: any[] = [];
    if (patch.name !== undefined) updates.push(sql`name = ${patch.name}`);
    if (patch.description !== undefined)
        updates.push(sql`description = ${patch.description}`);
    if (patch.triggers !== undefined)
        updates.push(sql`triggers = ${patch.triggers}::jsonb`);
    if (patch.steps !== undefined)
        updates.push(sql`steps = ${patch.steps}::jsonb`);
    if (patch.is_active !== undefined)
        updates.push(sql`is_active = ${patch.is_active}`);
    if (patch.is_sync !== undefined)
        updates.push(sql`is_sync = ${patch.is_sync}`);
    if (patch.updated_by !== undefined)
        updates.push(sql`updated_by = ${patch.updated_by}`);

    updates.push(sql`version = version + 1`);
    updates.push(sql`updated_at = NOW()`);

    const setClause = sql.join(updates, sql`, `);

    const result = await sql<AutoAction>`
        WITH updated_action AS (
            UPDATE auto_action
            SET ${setClause}
            WHERE id = ${id}::uuid
              AND version = ${expectedVersion}
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT
                'auto-action-events',
                fk_project_id::text,
                jsonb_build_object(
                    'type', 'auto_action.updated',
                    'autoActionId', id,
                    'projectId', fk_project_id,
                    'name', name,
                    'isActive', is_active,
                    'isSync', is_sync,
                    'actorId', updated_by
                )
            FROM updated_action
        )
        SELECT * FROM updated_action
    `.execute(db);

    const updated = result.rows[0];
    if (!updated) {
        throw new Error(
            `Failed to update Auto Action "${id}". Potential concurrent update or not found.`,
        );
    }

    return updated;
}

export async function deleteAutoActionById(id: string): Promise<void> {
    await sql`
        WITH deleted_action AS (
            DELETE FROM auto_action
            WHERE id = ${id}::uuid
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT
                'auto-action-events',
                fk_project_id::text,
                jsonb_build_object(
                    'type', 'auto_action.deleted',
                    'autoActionId', id,
                    'projectId', fk_project_id,
                    'name', name
                )
            FROM deleted_action
        )
        SELECT 1 FROM deleted_action
    `.execute(db);
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

/**
 * Checks if an event has already been processed by the auto-action consumer.
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
    const result = await db
        .selectFrom('processed_event')
        .where('event_id', '=', eventId as any)
        .where('consumer_group', '=', 'auto-action')
        .executeTakeFirst();
    return !!result;
}

/**
 * Marks an event as processed by the auto-action consumer.
 */
export async function markEventProcessed(eventId: string): Promise<void> {
    await db
        .insertInto('processed_event')
        .values({ event_id: eventId as any, consumer_group: 'auto-action' })
        .execute();
}
