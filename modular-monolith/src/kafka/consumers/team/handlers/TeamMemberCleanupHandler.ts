import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Handler for Team Member removals.
 * Dispatches targeted cleanup signals for cascading task unassignment.
 */
export class TeamMemberCleanupHandler {
    name = 'TeamMemberCleanupHandler';

    async handle(memberRemovals: Map<string, string[]>) {
        if (memberRemovals.size === 0) return;

        logger.info(
            `[Team Aggregator -> MemberCleanup] Signaling membership removals for ${memberRemovals.size} teams`,
        );

        const eventsToPublish = Array.from(memberRemovals.entries()).map(
            ([teamId, userIds]) => ({
                key: teamId,
                data: { teamId, userIds },
            }),
        );

        // We publish these to the AGGREGATED topic for cascading execution
        await eventBus.publish(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            KAFKA_EVENTS.TEAM_AGGREGATED.MEMBER_REMOVED,
            eventsToPublish,
        );
    }
}
