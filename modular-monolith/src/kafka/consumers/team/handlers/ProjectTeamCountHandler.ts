import { db } from '../../../../database';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

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

        await db.insertInto('outbox_events').values(outboxEntries).execute();
    }
}
