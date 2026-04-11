import { db } from '../../../database';
import { sql } from 'kysely';
import type { CreateNotificationParam, InternalNotification } from '../InternalNotificationService.ts';
import { getTimeString } from '../../../utils/utils.ts';

export const insertNotificationsBatch = async (rows: CreateNotificationParam[]): Promise<InternalNotification[]> => {
    if (rows.length === 0) return [];

    const userIds   = rows.map((r) => r.userId);
    const titles    = rows.map((r) => r.title);
    const messages  = rows.map((r) => r.message);
    const types     = rows.map((r) => r.type);
    const metadatas = rows.map((r) => JSON.stringify(r.metadata ?? {}));
    const now       = getTimeString();

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

export const insertNotification = async (data: CreateNotificationParam): Promise<InternalNotification> => {
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
    params: { cursor?: string; limit?: number } = {},
): Promise<{ notifications: InternalNotification[]; nextCursor: string | null }> => {
    const limit = Math.min(params.limit ?? 20, 50);
    const cursor = params.cursor; // Expecting format: "ISO_DATE|uuid"

    let cursorDate: string | null = null;
    let cursorId: string | null = null;

    if (cursor && cursor.includes('|')) {
        [cursorDate, cursorId] = cursor.split('|');
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
            read_at AS "readAt"
        FROM internal_notification
        WHERE fk_user_id = ${userId}
          AND (
              ${cursorDate} IS NULL
              OR created_at < ${cursorDate}
              OR (created_at = ${cursorDate} AND id < ${cursorId}::uuid)
          )
        ORDER BY created_at DESC, id DESC
        LIMIT ${limit + 1}
    `.execute(db);

    const hasMore = result.rows.length > limit;
    const notifications = hasMore ? result.rows.slice(0, limit) : result.rows;

    let nextCursor: string | null = null;
    if (hasMore && notifications.length > 0) {
        const last = notifications[notifications.length - 1]!;
        const dateStr = last.createdAt instanceof Date ? last.createdAt.toISOString() : last.createdAt;
        nextCursor = `${dateStr}|${last.id}`;
    }

    return { notifications, nextCursor };
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
