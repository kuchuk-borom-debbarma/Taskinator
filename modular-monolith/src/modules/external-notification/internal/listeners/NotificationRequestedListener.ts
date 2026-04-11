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
                console.log(`[External Notification] Processing notification for ${userIds.length} users`);

                // External notification usually involves looking up user preferences (Email, Slack, etc.)
                // For now, we delegate to the service which acts as a placeholder
                await Promise.all(
                    userIds.map(userId => 
                        externalNotificationService.sendNotification({
                            userId,
                            title,
                            message
                        })
                    )
                );
            },
        });
    }

    async stop() {}
}

export const notificationRequestedListener = new NotificationRequestedListener();
