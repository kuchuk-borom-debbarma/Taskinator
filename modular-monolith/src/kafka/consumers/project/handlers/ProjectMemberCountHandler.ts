import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Handler for Project Member counts.
 * Dispatches aggregated membership signals to the Project domain.
 */
export class ProjectMemberCountHandler {
    async handle(memberIncrements: Map<string, number>) {
        if (memberIncrements.size === 0) return;

        logger.info(
            `[Project Aggregator -> MemberCount] Signaling ${memberIncrements.size} project member count changes`,
        );

        const eventsToPublish = Array.from(memberIncrements.entries()).map(
            ([projectId, delta]) => ({
                key: projectId,
                data: { projectId, delta },
            }),
        );

        // We publish these to the AGGREGATED topic for module execution
        await eventBus.publish(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            KAFKA_EVENTS.PROJECT_AGGREGATED.MEMBER_COUNTS_CHANGED,
            eventsToPublish,
        );
    }
}
