import { db } from '../../../../database';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Publishes aggregated team member count changes using the Transactional Outbox.
 */
export class TeamMemberCountHandler {
    name = 'TeamMemberCountHandler';

    async handle(teamIncrements: Map<string, number>): Promise<void> {
        const teamEntries = Array.from(teamIncrements.entries());
        if (teamEntries.length === 0) return;

        logger.info(
            `[${this.name}] Signaling team member counts via Outbox: ${teamEntries.length} teams`,
        );

        const outboxEntries = teamEntries.map(([teamId, delta]) => ({
            kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
            kafka_key: teamId,
            payload: {
                type: KAFKA_EVENTS.TEAM_AGGREGATED.TEAM_MEMBER_COUNTS_CHANGED,
                teamId,
                delta,
            },
        }));

        await db.insertInto('outbox_events').values(outboxEntries).execute();
    }
}
