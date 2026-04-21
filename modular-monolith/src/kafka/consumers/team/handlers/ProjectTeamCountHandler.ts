import { db } from '../../../../database';
import { logger } from '../../../../logger';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { appendEventsToOutbox } from '../../../../utils/event-bus/OutboxQueries.ts';

/**
 * Publishes aggregated project team count changes using the Transactional Outbox.
 */
export class ProjectTeamCountHandler {
    name = 'ProjectTeamCountHandler';

    async handle(projectIncrements: Map<string, number>): Promise<void> {
        const projectEntries = Array.from(projectIncrements.entries());
        if (projectEntries.length === 0) return;

        logger.info(
            `[${this.name}] Signaling project team counts via Outbox: ${projectEntries.length} projects`,
        );

        const outboxEntries = projectEntries.map(([projectId, delta]) => ({
            kafka_topic: KAFKA_TOPICS.TEAM_AGGREGATED,
            kafka_key: projectId,
            payload: {
                type: KAFKA_EVENTS.TEAM_AGGREGATED.PROJECT_TEAM_COUNTS_CHANGED,
                projectId,
                delta,
            },
        }));

        await appendEventsToOutbox(db, outboxEntries);
    }
}
