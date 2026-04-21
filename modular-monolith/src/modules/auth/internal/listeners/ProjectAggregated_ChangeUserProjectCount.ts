import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
import { updateUserProjectCountsBulk } from '../AuthQueries.ts';

/**
 * Execution Listener
 *
 * This performs the actual bulk SQL updates against the 'users' table in the database
 * once the events have been aggregated and folded.
 */
export class ProjectAggregated_ChangeUserProjectCount {
    async init() {
        logger.info(
            '[ProjectAggregated -> Auth] Initializing Listener for users project counts',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'auth-project-aggregator-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.CHANGE_USER_PROJECT_COUNT]:
                    this.handleAggregatedCounts.bind(this),
            },
            { batch: true },
        );
    }

    private async handleAggregatedCounts(
        events: DomainEvent<{ userId: string; delta: number }>[],
    ) {
        if (events.length === 0) return;

        // Consolidate multiple events for the same user into a single delta
        // (Even in aggregated events, we might have multiple increments for a busy user in one batch)
        const consolidates = new Map<string, number>();
        for (const event of events) {
            const { userId, delta } = event.data;
            consolidates.set(userId, (consolidates.get(userId) || 0) + delta);
        }

        const entries = Array.from(consolidates.entries());
        logger.info(
            `[Auth Listener] Performing bulk projects_count update for ${entries.length} users (from ${events.length} events)`,
        );

        try {
            await updateUserProjectCountsBulk(consolidates);

            logger.info(
                '[Auth Listener] Successfully updated projects_count for user batch',
            );
        } catch (err) {
            logger.error(
                '[Auth Listener] Failed to update projects_count in bulk:',
                err,
            );
            throw err;
        }
    }
}
