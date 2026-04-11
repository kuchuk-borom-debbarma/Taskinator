import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus.ts';
import { internalNotificationService } from '../../index.ts';

export class NotificationRequestedListener {
    async init() {
        await eventBus.subscribe('internal-notification-group', {
            [KAFKA_EVENTS.NOTIFICATION.REQUESTED]: async (data: {
                userIds: string[];
                title: string;
                message: string;
                type: string;
                metadata: any;
            }) => {
                const { userIds, title, message, type, metadata } = data;
                console.log(`[Internal Notification] Batch-inserting notifications for ${userIds.length} users`);

                // Single INSERT ... SELECT unnest(...) — one DB round-trip for all recipients
                await internalNotificationService.createNotificationsBatch(
                    userIds.map((userId) => ({ userId, title, message, type, metadata })),
                );
            },
        });
    }

    async stop() { }
}

export const notificationRequestedListener = new NotificationRequestedListener();
