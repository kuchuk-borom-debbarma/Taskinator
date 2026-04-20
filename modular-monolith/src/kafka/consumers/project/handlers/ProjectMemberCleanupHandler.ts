import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Handler for Project Member removals.
 * Dispatches targeted cleanup signals for cascading removal from teams/tasks.
 */
export class ProjectMemberCleanupHandler {
    name = 'ProjectMemberCleanupHandler';

    async handle(memberRemovals: Map<string, string[]>) {
        if (memberRemovals.size === 0) return;

        logger.info(
            `[Project Aggregator -> MemberCleanup] Signaling membership removals for ${memberRemovals.size} projects`,
        );

        const eventsToPublish = Array.from(memberRemovals.entries()).map(
            ([projectId, userIds]) => ({
                key: projectId,
                data: { projectId, userIds },
            }),
        );

        // We publish these to the AGGREGATED topic for cascading execution
        await eventBus.publish(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            KAFKA_EVENTS.PROJECT_AGGREGATED.MEMBER_REMOVED,
            eventsToPublish,
        );
    }
}
