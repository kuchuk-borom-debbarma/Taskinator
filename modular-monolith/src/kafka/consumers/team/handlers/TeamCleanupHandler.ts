import { db } from '../../../../database';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Publishes signaling events for Team cleanup using the Transactional Outbox.
 */
export class TeamCleanupHandler {
    name = 'TeamCleanupHandler';

    async handle(teamIds: string[]): Promise<void> {
        if (teamIds.length === 0) return;

        logger.info(
            `[${this.name}] Signaling cleanup via Outbox: ${teamIds.length} teams`,
        );

        await db
            .insertInto('outbox_events')
            .values([
                {
                    kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
                    kafka_key: 'cleanup',
                    payload: {
                        type: KAFKA_EVENTS.TEAM_AGGREGATED.DELETED,
                        teamIds,
                    },
                },
            ])
            .execute();
    }
}
