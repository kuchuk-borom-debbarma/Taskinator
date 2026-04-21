import { db } from '../../../../database';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

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

        await db
            .insertInto('outbox_events')
            .values([
                {
                    kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                    kafka_key: projectId,
                    payload: {
                        type: KAFKA_EVENTS.PROJECT_AGGREGATED.MEMBER_REMOVED,
                        projectId,
                        userIds,
                    },
                },
            ])
            .execute();
    }
}
