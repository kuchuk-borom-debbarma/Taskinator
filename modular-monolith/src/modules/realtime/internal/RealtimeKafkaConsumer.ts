import eventBus from '../../../utils/EventBus.ts';
import { KAFKA_EVENTS } from '../../../utils/event-bus/constants.ts';
import { pubsub } from '../../../graphql/pubsub';
import { logger } from '../../../logger';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

/**
 * RealtimeKafkaConsumer listens to Kafka events and fans them out
 * to locally connected SSE clients via SSEManager.
 * 
 * Scalability:
 * Each instance uses a unique Group ID to ensure every server 
 * receives every event (Fan-out/Broadcast pattern).
 */
export class RealtimeKafkaConsumer {
    // Generate a unique, ephemeral group ID for this instance
    private groupId = `realtime-fanout-${os.hostname()}-${uuidv4().substring(0, 8)}`;

    async init() {
        logger.info(`[Realtime] Initializing Kafka Fan-out Consumer with group: ${this.groupId}`);

        await eventBus.subscribe(this.groupId, {
            // 1. Task Updates: Broadcast to all connected members of the project
            [KAFKA_EVENTS.PROJECT_TASK.CREATED]: async (data: any) => {
                pubsub.publish('task_created', {
                    id: data.id,
                    projectId: data.projectId,
                    title: data.title
                });
            },
            [KAFKA_EVENTS.PROJECT_TASK.UPDATED]: async (data: any) => {
                pubsub.publish('task_updated', {
                    id: data.id,
                    projectId: data.projectId,
                    version: data.version
                });
            },
            [KAFKA_EVENTS.PROJECT_TASK.DELETED]: async (data: any) => {
                pubsub.publish('task_deleted', {
                    id: data.id,
                    projectId: data.projectId
                });
            },

            // 2. Notifications: Push to specific users
            [KAFKA_EVENTS.NOTIFICATION.REQUESTED]: async (data: { userIds: string[]; title: string; message: string; type: string; metadata: any }) => {
                const userIds = Array.isArray(data?.userIds) ? data.userIds : [];
                userIds.forEach(userId => {
                    pubsub.publish('notification_created', {
                        title: data.title,
                        message: data.message,
                        type: data.type,
                        metadata: data.metadata
                    });
                });
            }

        });
    }

    async stop() {
        // Handled by eventBus.destroy() typically, but could add local cleanup here
        logger.info(`[Realtime] Stopping Kafka Fan-out Consumer`);
    }
}

export const realtimeKafkaConsumer = new RealtimeKafkaConsumer();
