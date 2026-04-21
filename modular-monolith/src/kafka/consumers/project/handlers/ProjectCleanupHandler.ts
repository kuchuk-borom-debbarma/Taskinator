import { db } from '../../../../database';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Publishes signaling events for Project cleanup using the Transactional Outbox.
 */
export class ProjectCleanupHandler {
    name = 'ProjectCleanupHandler';

    async handle(projectIds: string[]): Promise<void> {
        if (projectIds.length === 0) return;

        logger.info(
            `[${this.name}] Signaling cleanup via Outbox: ${projectIds.length} projects`,
        );

        await db
            .insertInto('outbox_events')
            .values([
                {
                    kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                    kafka_key: 'cleanup',
                    payload: {
                        type: KAFKA_EVENTS.PROJECT_AGGREGATED.DELETED,
                        projectIds,
                    },
                },
            ])
            .execute();
    }
}
