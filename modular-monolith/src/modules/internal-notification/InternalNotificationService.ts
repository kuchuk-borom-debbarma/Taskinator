import type { BaseService } from '../project';

export interface InternalNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    metadata: any;
    isRead: boolean;
    createdAt: Date;
    createdAtPrecision?: string;
    readAt: Date | null;
}

export interface CreateNotificationParam {
    userId: string;
    title: string;
    message: string;
    type: string;
    metadata?: any;
}

export interface InternalNotificationService extends BaseService {
    createNotification(
        data: CreateNotificationParam,
    ): Promise<InternalNotification>;
    createNotificationsBatch(
        rows: CreateNotificationParam[],
    ): Promise<InternalNotification[]>;
    markAsRead(userId: string, notificationId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    getNotifications(
        userId: string,
        params: { first?: number; after?: string; last?: number; before?: string },
    ): Promise<{
        notifications: InternalNotification[];
        nextCursor: string | null;
        prevCursor: string | null;
    }>;
    getUnreadCount(userId: string): Promise<number>;
}
