import { db } from '../../../../database';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Signaling for Team Member removal cleanup via Transactional Outbox.
 */
export class TeamMemberCleanupHandler {
    name = 'TeamMemberCleanupHandler';

    async handle(teamId: string, userIds: string[]): Promise<void> {
        if (userIds.length === 0) return;

        logger.info(
            `[${this.name}] Signaling member cleanup via Outbox: ${userIds.length} users in team ${teamId}`,
        );

        await db
            .insertInto('outbox_events')
            .values([
                {
                    kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
                    kafka_key: teamId,
                    payload: {
                        type: KAFKA_EVENTS.TEAM_AGGREGATED.MEMBER_REMOVED,
                        teamId,
                        userIds,
                    },
                },
            ])
            .execute();
    }
}
