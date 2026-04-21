import { db } from '../../../../database';
import { logger } from '../../../../logger';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { appendEventsToOutbox } from '../../../../utils/event-bus/OutboxQueries.ts';

/**
 * Handles manual cleanup for Team deletion.
 * Since DB-level cascades are disabled, this handler ensure:
 * 1. Team memberships are removed.
 * 2. Tasks assigned to the team are unassigned (FK nullified).
 */
export class TeamCleanupHandler {
    name = 'TeamCleanupHandler';

    async handle(teamIds: string[]): Promise<void> {
        if (teamIds.length === 0) return;

        logger.info(
            `[${this.name}] Signaling team cleanup via Outbox: ${teamIds.length} teams`,
        );

        await appendEventsToOutbox(db, [
            {
                kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
                kafka_key: 'cleanup',
                payload: {
                    type: KAFKA_EVENTS.TEAM_AGGREGATED.DELETED,
                    teamIds,
                },
            },
        ]);
    }
}
