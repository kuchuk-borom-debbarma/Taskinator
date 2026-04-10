import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus.ts';
import { internalNotificationService } from '../index.ts';

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
                console.log(`[Internal Notification] Processing notification for ${userIds.length} users`);

                // Create notifications in parallel for all users
                // In a real 10k RPS system, we might use a batch insert query here
                await Promise.all(
                    userIds.map(userId => 
                        internalNotificationService.createNotification({
                            userId,
                            title,
                            message,
                            type,
                            metadata
                        })
                    )
                );
            },
        });
    }

    async stop() {}
}

export const notificationRequestedListener = new NotificationRequestedListener();
