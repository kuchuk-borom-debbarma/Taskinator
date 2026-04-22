import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import { updateProjectTeamCountsBulk } from '../ProjectQueries.ts';

/**
 * Execution Listener for Project Team counts.
 * Listens to aggregated signals from the Team aggregator.
 */
export class TeamAggregated_SyncProjectTeamCountListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Project] Initializing Listener for teams_count updates',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            'project-team-count-group',
            {
                [KAFKA_EVENTS.TEAM_AGGREGATED.SYNC_PROJECT_TEAM_COUNT]:
                    this.handleSyncProjectTeamCount.bind(this),
            },
            { batch: true },
        );
    }

    private async handleSyncProjectTeamCount(
        events: DomainEvent<{ projectId: string; delta: number }>[],
    ) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'project-team-count-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Consolidate multiple events for the same project into a single delta
            const updates = new Map<string, number>();
            for (const event of unprocessed) {
                const { projectId, delta } = event.data;
                updates.set(projectId, (updates.get(projectId) || 0) + delta);
            }

            logger.info(
                `[TeamAggregated -> Project] Performing bulk update for ${updates.size} projects (from ${unprocessed.length} events)`,
            );

            await updateProjectTeamCountsBulk(updates, trx);
        });
    }
}
