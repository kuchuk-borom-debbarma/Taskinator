import { db } from '../../../database';
import { sql } from 'kysely';
import type { CreateNotificationParam, InternalNotification } from '../InternalNotificationService.ts';
import { getTimeString } from '../../../utils/utils.ts';

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

export const getNotifications = async (userId: string, limit: number, offset: number): Promise<InternalNotification[]> => {
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
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
    `.execute(db);
    return result.rows;
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
