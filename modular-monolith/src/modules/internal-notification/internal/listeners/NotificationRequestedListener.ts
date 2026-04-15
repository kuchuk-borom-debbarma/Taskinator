import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus.ts';
import { internalNotificationService } from '../../index.ts';
import { pubsub } from '../../../../graphql/pubsub.ts';

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
                console.log(
                    `[Internal Notification] Batch-inserting notifications for ${userIds.length} users`,
                );

                // Single INSERT ... SELECT unnest(...) — one DB round-trip for all recipients
                const notifications =
                    await internalNotificationService.createNotificationsBatch(
                        userIds.map((userId) => ({
                            userId,
                            title,
                            message,
                            type,
                            metadata,
                        })),
                    );

                // Push individual CREATED events to Kafka for fan-out to all SSE instances
                await eventBus.publish(
                    KAFKA_EVENTS.NOTIFICATION.CREATED,
                    notifications.map((n) => ({
                        key: n.userId,
                        data: {
                            id: n.id,
                            userId: n.userId,
                            title: n.title,
                            message: n.message,
                            type: n.type,
                            metadata: n.metadata,
                            isRead: n.isRead,
                            createdAt: n.createdAt,
                        },
                    })),
                );
            },
        });
    }

    async stop() {}
}

export const notificationRequestedListener =
    new NotificationRequestedListener();
