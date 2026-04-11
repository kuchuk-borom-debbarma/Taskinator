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
    createNotification(data: CreateNotificationParam): Promise<InternalNotification>;
    createNotificationsBatch(rows: CreateNotificationParam[]): Promise<InternalNotification[]>;
    markAsRead(userId: string, notificationId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    getNotifications(
        userId: string,
        params: { cursor?: string; limit?: number }
    ): Promise<{ notifications: InternalNotification[]; nextCursor: string | null }>;
    getUnreadCount(userId: string): Promise<number>;
}
