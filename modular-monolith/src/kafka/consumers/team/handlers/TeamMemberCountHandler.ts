import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Publishes aggregated member count changes per team.
 */
export class TeamMemberCountHandler {
    name = 'TeamMemberCountHandler';

    async handle(teamIncrements: Map<string, number>): Promise<void> {
        const entries = Array.from(teamIncrements.entries());
        if (entries.length === 0) return;

        logger.info(
            `[${this.name}] Dispatching ${entries.length} per-team member increment events`,
        );

        const eventsToPublish = entries.map(([teamId, delta]) => ({
            key: teamId,
            data: { teamId, delta },
        }));

        await eventBus.publish(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            KAFKA_EVENTS.TEAM_AGGREGATED.TEAM_MEMBER_COUNTS_CHANGED,
            eventsToPublish,
        );
    }
}
