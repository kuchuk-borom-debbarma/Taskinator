import { logger } from '../../../logger';
import type { PaginationParams } from '../../../types/pagination.ts';
import eventBus from '../../../utils/EventBus.ts';
import type {
    CreateNotificationParam,
    InternalNotification,
    InternalNotificationService,
} from '../InternalNotificationService.ts';
import * as Queries from './InternalNotificationQueries.ts';

export class InternalNotificationServiceImpl
    implements InternalNotificationService
{
    async createNotification(
        data: CreateNotificationParam,
    ): Promise<InternalNotification> {
        logger.debug(
            `InternalNotificationService.createNotification for user: ${data.userId}, type: ${data.type}`,
        );
        return await Queries.insertNotification(data);
    }

    async createNotificationsBatch(
        rows: CreateNotificationParam[],
    ): Promise<InternalNotification[]> {
        logger.info(
            `InternalNotificationService.createNotificationsBatch for ${rows.length} notifications`,
        );
        return await Queries.insertNotificationsBatch(rows);
    }

    async markAsRead(userId: string, notificationId: string): Promise<void> {
        logger.debug(
            `InternalNotificationService.markAsRead: ${notificationId} for user: ${userId}`,
        );
        await Queries.markAsRead(userId, notificationId);
    }

    async markAllAsRead(userId: string): Promise<void> {
        logger.info(
            `InternalNotificationService.markAllAsRead for user: ${userId}`,
        );
        await Queries.markAllAsRead(userId);
    }

    async getNotifications(
        userId: string,
        params: PaginationParams,
    ): Promise<{
        notifications: InternalNotification[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
        logger.debug(
            `InternalNotificationService.getNotifications for user: ${userId}`,
        );
        return await Queries.getNotifications(userId, params);
    }

    async getUnreadCount(userId: string): Promise<number> {
        return await Queries.getUnreadCount(userId);
    }

    async init(): Promise<void> {
        logger.info(`InternalNotificationService initialized`);
        await eventBus.init();
    }

    async destroy(): Promise<void> {
        logger.info(`InternalNotificationService destroyed`);
        await eventBus.destroy();
    }
}
