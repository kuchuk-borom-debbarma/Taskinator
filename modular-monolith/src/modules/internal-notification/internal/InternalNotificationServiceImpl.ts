import type {
    CreateNotificationParam,
    InternalNotification,
    InternalNotificationService,
} from '../InternalNotificationService.ts';
import * as Queries from './InternalNotificationQueries.ts';
import eventBus from '../../../utils/EventBus.ts';
import { notificationRequestedListener } from './listeners/NotificationRequestedListener.ts';

export class InternalNotificationServiceImpl
    implements InternalNotificationService
{
    async createNotification(
        data: CreateNotificationParam,
    ): Promise<InternalNotification> {
        return await Queries.insertNotification(data);
    }

    async createNotificationsBatch(
        rows: CreateNotificationParam[],
    ): Promise<InternalNotification[]> {
        return await Queries.insertNotificationsBatch(rows);
    }

    async markAsRead(userId: string, notificationId: string): Promise<void> {
        await Queries.markAsRead(userId, notificationId);
    }

    async markAllAsRead(userId: string): Promise<void> {
        await Queries.markAllAsRead(userId);
    }

    async getNotifications(
        userId: string,
        params: { cursor?: string; limit?: number },
    ): Promise<{
        notifications: InternalNotification[];
        nextCursor: string | null;
    }> {
        return await Queries.getNotifications(userId, params);
    }

    async getUnreadCount(userId: string): Promise<number> {
        return await Queries.getUnreadCount(userId);
    }

    async init(): Promise<void> {
        console.log(`Initializing event bus ${this.constructor.name}`);
        await eventBus.init();
        await notificationRequestedListener.init();
    }

    async destroy(): Promise<void> {
        console.log(`Disconnecting event bus ${this.constructor.name}`);
        await notificationRequestedListener.stop();
        await eventBus.destroy();
    }
}
