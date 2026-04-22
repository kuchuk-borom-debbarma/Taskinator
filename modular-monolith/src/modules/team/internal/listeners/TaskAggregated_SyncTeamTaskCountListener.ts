import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import { updateTeamTaskCountsBulk } from '../TeamQueries.ts';

/**
 * Execution Listener for Team Task counts.
 * Listens to aggregated signals from the Task aggregator.
 */
export class TaskAggregated_SyncTeamTaskCountListener {
    async init() {
        logger.info(
            '[TaskAggregated -> Team] Initializing Listener for team tasks_count updates',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'team-task-count-group',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.SYNC_TEAM_TASK_COUNT]:
                    this.handleTeamTaskCountsChanged.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTeamTaskCountsChanged(
        events: DomainEvent<{ teamId: string; delta: number }>[],
    ) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'team-task-count-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Consolidate multiple signals for the same team
            const updates = new Map<string, number>();
            for (const event of unprocessed) {
                const { teamId, delta } = event.data;
                updates.set(teamId, (updates.get(teamId) || 0) + delta);
            }

            logger.info(
                `[TaskAggregated -> Team] Syncing task counts for ${updates.size} teams`,
            );

            await updateTeamTaskCountsBulk(updates, trx);
        });
    }
}
