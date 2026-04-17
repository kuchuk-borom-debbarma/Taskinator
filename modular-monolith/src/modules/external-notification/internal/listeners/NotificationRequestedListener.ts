import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus.ts';
import { externalNotificationService } from '../../index.ts';

export class NotificationRequestedListener {
    async init() {
        await eventBus.subscribe('external-notification-group', {
            [KAFKA_EVENTS.NOTIFICATION.REQUESTED]: async (data: {
                userIds: string[];
                title: string;
                message: string;
                type: string;
                metadata: any;
            }) => {
                const { userIds, title, message } = data;
                console.log(
                    `[External Notification] Processing notification for ${userIds.length} users`,
                );

                // Single provider-level batch call — O(1) outbound HTTP regardless of recipient count
                await externalNotificationService.sendNotificationBatch({
                    userIds,
                    title,
                    message,
                });
            },
        });
    }

    async stop() {}
}

export const notificationRequestedListener =
    new NotificationRequestedListener();
