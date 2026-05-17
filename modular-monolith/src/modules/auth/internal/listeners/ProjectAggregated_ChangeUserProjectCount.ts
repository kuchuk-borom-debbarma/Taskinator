import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
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

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'auth-project-aggregator-group',
            );

            if (unprocessed.length === 0) return;

            const UUID_REGEX =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const validUnprocessed = unprocessed.filter(
                (event) =>
                    event.data.userId && UUID_REGEX.test(event.data.userId),
            );

            if (validUnprocessed.length === 0) {
                logger.debug(
                    `[Auth Listener] All ${unprocessed.length} events skipped (no valid UUID userIds found)`,
                );
                return;
            }

            // [2] Consolidate multiple events for the same user into a single delta
            const consolidates = new Map<string, number>();
            for (const event of validUnprocessed) {
                const { userId, delta } = event.data;
                logger.debug(
                    `[Auth Listener] Aggregating count for user ${userId}: delta ${delta}`,
                );
                consolidates.set(
                    userId,
                    (consolidates.get(userId) || 0) + delta,
                );
            }

            const entries = Array.from(consolidates.entries());
            logger.info(
                `[Auth Listener] Performing bulk projects_count update for ${entries.length} users (from ${validUnprocessed.length} events)`,
            );

            await updateUserProjectCountsBulk(consolidates, trx);
        });
    }
}
