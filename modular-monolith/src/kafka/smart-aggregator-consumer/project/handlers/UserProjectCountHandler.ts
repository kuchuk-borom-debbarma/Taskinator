import { db } from '../../../../database';
import { logger } from '../../../../logger';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { appendEventsToOutbox } from '../../../../utils/event-bus/OutboxQueries.ts';

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

        await appendEventsToOutbox(db, outboxEntries);
    }
}
