import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Publishes signaling events for Task cleanup after batch deletions.
 */
export class TaskCleanupHandler {
    name = 'TaskCleanupHandler';

    async handle(taskIds: string[]): Promise<void> {
        if (taskIds.length === 0) return;

        logger.info(
            `[${this.name}] Signaling cleanup for ${taskIds.length} deleted tasks`,
        );

        await eventBus.publish(
            KAFKA_TOPICS.TASK_AGGREGATED,
            KAFKA_EVENTS.TASK_AGGREGATED.DELETED,
            [
                {
                    key: 'cleanup',
                    data: { taskIds },
                },
            ],
        );
    }
}
