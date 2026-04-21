import { db } from '../../../../database';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Publishes aggregated project member count changes using the Transactional Outbox.
 */
export class ProjectMemberCountHandler {
    name = 'ProjectMemberCountHandler';

    async handle(projectIncrements: Map<string, number>): Promise<void> {
        const projectEntries = Array.from(projectIncrements.entries());
        if (projectEntries.length === 0) return;

        logger.info(
            `[${this.name}] Signaling project member counts via Outbox: ${projectEntries.length} projects`,
        );

        const outboxEntries = projectEntries.map(([projectId, delta]) => ({
            kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
            kafka_key: projectId,
            payload: {
                type: KAFKA_EVENTS.PROJECT_AGGREGATED.MEMBER_COUNTS_CHANGED,
                projectId,
                delta,
            },
        }));

        await db.insertInto('outbox_events').values(outboxEntries).execute();
    }
}
