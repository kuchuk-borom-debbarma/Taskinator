import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Publishes aggregated team count changes per project.
 */
export class ProjectTeamCountHandler {
    name = 'ProjectTeamCountHandler';

    async handle(projectIncrements: Map<string, number>): Promise<void> {
        const entries = Array.from(projectIncrements.entries());
        if (entries.length === 0) return;

        logger.info(
            `[${this.name}] Dispatching ${entries.length} per-project team increment events`,
        );

        const eventsToPublish = entries.map(([projectId, delta]) => ({
            key: projectId,
            data: { projectId, delta },
        }));

        await eventBus.publish(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            KAFKA_EVENTS.TEAM_AGGREGATED.PROJECT_TEAM_COUNTS_CHANGED,
            eventsToPublish,
        );
    }
}
