import { db } from '../../../../database';
import { logger } from '../../../../logger';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { appendEventsToOutbox } from '../../../../utils/event-bus/OutboxQueries.ts';

/**
 * Signaling for Project Member removal cleanup via Transactional Outbox.
 */
export class ProjectMemberCleanupHandler {
    name = 'ProjectMemberCleanupHandler';

    async handle(projectId: string, userIds: string[]): Promise<void> {
        if (userIds.length === 0) return;

        logger.info(
            `[${this.name}] Signaling member cleanup via Outbox: ${userIds.length} users in project ${projectId}`,
        );

        await appendEventsToOutbox(db, [
            {
                kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                kafka_key: projectId,
                payload: {
                    type: KAFKA_EVENTS.PROJECT_AGGREGATED.MEMBER_REMOVED,
                    projectId,
                    userIds,
                },
            },
        ]);
    }
}
