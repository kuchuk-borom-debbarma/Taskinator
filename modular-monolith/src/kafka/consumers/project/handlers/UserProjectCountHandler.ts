import { db } from '../../../../database';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Publishes aggregated project count changes per user using the Transactional Outbox.
 */
export class UserProjectCountHandler {
    name = 'UserProjectCountHandler';

    async handle(userIncrements: Map<string, number>): Promise<void> {
        const userEntries = Array.from(userIncrements.entries());
        if (userEntries.length === 0) return;

        logger.info(
            `[${this.name}] Signaling per-user project counts via Outbox: ${userEntries.length} users`,
        );

        const outboxEntries = userEntries.map(([userId, delta]) => ({
            kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
            kafka_key: userId,
            payload: {
                type: KAFKA_EVENTS.PROJECT_AGGREGATED.COUNTS_CHANGED,
                userId,
                delta,
            },
        }));

        await db.insertInto('outbox_events').values(outboxEntries).execute();
    }
}
