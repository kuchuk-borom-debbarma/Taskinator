import { db } from '../../../database';
import { sql } from 'kysely';
import type {
    CreateNotificationParam,
    InternalNotification,
} from '../InternalNotificationService.ts';
import { getTimeString } from '../../../utils/utils.ts';

export const insertNotificationsBatch = async (
    rows: CreateNotificationParam[],
): Promise<InternalNotification[]> => {
    if (rows.length === 0) return [];

    const userIds = rows.map((r) => r.userId);
    const titles = rows.map((r) => r.title);
    const messages = rows.map((r) => r.message);
    const types = rows.map((r) => r.type);
    const metadatas = rows.map((r) => JSON.stringify(r.metadata ?? {}));
    const now = getTimeString();

    const result = await sql<InternalNotification>`
        INSERT INTO internal_notification (fk_user_id, title, message, type, metadata, created_at)
        SELECT
            unnest(${userIds}::text[]),
            unnest(${titles}::text[]),
            unnest(${messages}::text[]),
            unnest(${types}::text[]),
            unnest(${metadatas}::jsonb[]),
            ${now}::timestamptz
        RETURNING
            id,
            fk_user_id AS "userId",
            title,
            message,
            type,
            metadata,
            is_read    AS "isRead",
            created_at AS "createdAt",
            read_at    AS "readAt"
    `.execute(db);

    return result.rows;
};

export const insertNotification = async (
    data: CreateNotificationParam,
): Promise<InternalNotification> => {
    const result = await sql<any>`
        INSERT INTO internal_notification (fk_user_id, title, message, type, metadata)
        VALUES (${data.userId}, ${data.title}, ${data.message}, ${data.type}, ${JSON.stringify(data.metadata || {})})
        RETURNING 
            id,
            fk_user_id AS "userId",
            title,
            message,
            type,
            metadata,
            is_read AS "isRead",
            created_at AS "createdAt",
            read_at AS "readAt"
    `.execute(db);
    return result.rows[0];
};

export const getNotifications = async (
    userId: string,
    params: { first?: number; after?: string; last?: number; before?: string } = {},
): Promise<{
    notifications: InternalNotification[];
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
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

    const result = await sql<any>`
        SELECT 
            id,
            fk_user_id AS "userId",
            title,
            message,
            type,
            metadata,
            is_read AS "isRead",
            created_at AS "createdAt",
            TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "createdAtPrecision",
            read_at AS "readAt"
        FROM internal_notification
        WHERE fk_user_id = ${userId}::text
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

    const notifications = rows;
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (notifications.length > 0) {
        const first = notifications[0]!;
        const last = notifications[notifications.length - 1]!;
        const firstDateStr = last.createdAtPrecision; // wait, first is first, last is last
        const fDate = first.createdAtPrecision;
        const lDate = last.createdAtPrecision;

        if (isBackward) {
            nextCursor = `${lDate}|${last.id}`;
            prevCursor = hasMore ? `${fDate}|${first.id}` : null;
        } else {
            nextCursor = hasMore ? `${lDate}|${last.id}` : null;
            prevCursor = after ? `${fDate}|${first.id}` : null;
        }
    }

    return { notifications, nextCursor, prevCursor };
};

export const markAsRead = async (userId: string, id: string): Promise<void> => {
    await sql`
        UPDATE internal_notification
        SET is_read = TRUE,
            read_at = ${getTimeString()}
        WHERE id = ${id}::uuid AND fk_user_id = ${userId}
    `.execute(db);
};

export const markAllAsRead = async (userId: string): Promise<void> => {
    await sql`
        UPDATE internal_notification
        SET is_read = TRUE,
            read_at = ${getTimeString()}
        WHERE fk_user_id = ${userId} AND is_read = FALSE
    `.execute(db);
};

export const getUnreadCount = async (userId: string): Promise<number> => {
    const result = await sql<{ count: string }>`
        SELECT count(*) as count
        FROM internal_notification
        WHERE fk_user_id = ${userId} AND is_read = FALSE
    `.execute(db);
    return parseInt(result.rows[0]?.count ?? '0');
};
