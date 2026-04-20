import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Publishes aggregated project count changes per user.
 */
export class UserProjectCountHandler {
    name = 'UserProjectCountHandler';

    async handle(userIncrements: Map<string, number>): Promise<void> {
        const userEntries = Array.from(userIncrements.entries());
        if (userEntries.length === 0) return;

        logger.info(
            `[${this.name}] Dispatching ${userEntries.length} per-user increment events`,
        );

        const eventsToPublish = userEntries.map(([userId, delta]) => ({
            key: userId,
            data: { userId, delta },
        }));

        await eventBus.publish(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            KAFKA_EVENTS.PROJECT_AGGREGATED.COUNTS_CHANGED,
            eventsToPublish,
        );
    }
}
