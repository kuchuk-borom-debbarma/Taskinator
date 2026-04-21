import { db } from '../../../../database';
import { logger } from '../../../../logger';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { appendEventsToOutbox } from '../../../../utils/event-bus/OutboxQueries.ts';

/**
 * Publishes signaling events for Project cleanup using the Transactional Outbox.
 */
export class ProjectCleanupHandler {
    name = 'ProjectCleanupHandler';

    async handle(projectIds: string[]): Promise<void> {
        if (projectIds.length === 0) return;

        logger.info(
            `[${this.name}] Signaling project cleanup via Outbox: ${projectIds.length} projects`,
        );

        await appendEventsToOutbox(db, [
            {
                kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                kafka_key: 'cleanup',
                payload: {
                    type: KAFKA_EVENTS.PROJECT_AGGREGATED.DELETED,
                    projectIds,
                },
            },
        ]);
    }
}
