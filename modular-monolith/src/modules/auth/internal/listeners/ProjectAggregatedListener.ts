import eventBus from '../../../../utils/EventBus.ts';
import { KAFKA_EVENTS } from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { db } from '../../../../database';
import { sql } from 'kysely';
import { logger } from '../../../../logger';

export class ProjectAggregatedListener {
    async init() {
        logger.info(
            '[Auth Listener] Initializing listener for project.aggregated.counts_changed',
        );

        await eventBus.subscribe(
            'auth-project-aggregator-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.COUNTS_CHANGED]:
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
            await sql`
                UPDATE users SET 
                    projects_count = users.projects_count + v.delta
                FROM (
                    SELECT * FROM UNNEST(${entries.map((e) => e[0])}::uuid[], ${entries.map((e) => e[1])}::int[])
                ) AS v(id, delta)
                WHERE users.id = v.id
            `.execute(db);

            logger.info(
                '[Auth Listener] Successfully updated projects_count for user batch',
            );
        } catch (err) {
            logger.error(
                '[Auth Listener] Failed to update projects_count in bulk:',
                err,
            );
            // In a real system, we might want to throw to trigger Kafka retry
            throw err;
        }
    }
}
