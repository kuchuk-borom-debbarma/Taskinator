import { db } from '../../../../database';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Publishes signaling events for Task cleanup using the Transactional Outbox.
 */
export class TaskCleanupHandler {
    name = 'TaskCleanupHandler';

    async handle(taskIds: string[]): Promise<void> {
        if (taskIds.length === 0) return;

        logger.info(
            `[${this.name}] Signaling cleanup via Outbox: ${taskIds.length} tasks`,
        );

        await db
            .insertInto('outbox_events')
            .values([
                {
                    kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                    kafka_key: 'cleanup',
                    payload: {
                        type: KAFKA_EVENTS.TASK_AGGREGATED.DELETED,
                        taskIds,
                    },
                },
            ])
            .execute();
    }
}
