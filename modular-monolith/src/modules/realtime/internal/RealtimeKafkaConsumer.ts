import eventBus from '../../../utils/EventBus.ts';
import { KAFKA_EVENTS } from '../../../utils/event-bus/constants.ts';
import { logger } from '../../../logger';
import { redisPublisher } from '../../../redis/index.ts';

/**
 * RealtimeRouterConsumer acts as the single routing gateway between 
 * the durable Kafka log and the volatile Redis PubSub network.
 * 
 * Scalability:
 * Uses a static Group ID so Kafka load-balances events to exactly ONE node.
 * That node then queries the Redis routing table and punches the payload
 * exclusively to active instances hosting connected clients.
 */
export class RealtimeRouterConsumer {
    // Static group ID triggers Kafka Load Balancing (Prevents Fan-out multiplier)
    private groupId = `realtime-targeted-router-group`;

    private async routeEvent(targetKey: string, topic: string, payload: any) {
        // Find which physical instances are currently hosting these WebSockets
        const instances = await redisPublisher.smembers(targetKey);
        if (!instances || instances.length === 0) return;

        const message = JSON.stringify({ topic, payload });
        
        // Punch the payload directly to the active hardware nodes
        const promises = instances.map(iid => 
            redisPublisher.publish(`instance:${iid}`, message)
        );
        
        await Promise.all(promises);
    }

    async init() {
        logger.info(`[Realtime] Initializing Kafka Fan-out Consumer with group: ${this.groupId}`);

        await eventBus.subscribe(this.groupId, {
            // 1. Task Updates: Route to active members of the project
            [KAFKA_EVENTS.PROJECT_TASK.CREATED]: async (data: any) => {
                await this.routeEvent(`route:project:${data.projectId}`, 'task_created', {
                    id: data.id,
                    projectId: data.projectId,
                    title: data.title
                });
            },
            [KAFKA_EVENTS.PROJECT_TASK.UPDATED]: async (data: any) => {
                await this.routeEvent(`route:project:${data.projectId}`, 'task_updated', {
                    id: data.id,
                    projectId: data.projectId,
                    version: data.version
                });
            },
            [KAFKA_EVENTS.PROJECT_TASK.DELETED]: async (data: any) => {
                await this.routeEvent(`route:project:${data.projectId}`, 'task_deleted', {
                    id: data.id,
                    projectId: data.projectId
                });
            },

            // 2. Notifications: Route directly to the targeted user
            [KAFKA_EVENTS.NOTIFICATION.CREATED]: async (data: any) => {
                await this.routeEvent(`route:user:${data.userId}`, 'notification_created', {
                    id: data.id,
                    userId: data.userId,
                    title: data.title,
                    message: data.message,
                    type: data.type,
                    metadata: data.metadata,
                    isRead: data.isRead,
                    createdAt: data.createdAt,
                });
            }

        });
    }

    async stop() {
        // Handled by eventBus.destroy() typically, but could add local cleanup here
        logger.info(`[Realtime] Stopping Kafka Fan-out Consumer`);
    }
}

export const realtimeRouterConsumer = new RealtimeRouterConsumer();
