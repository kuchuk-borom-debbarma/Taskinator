import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import { updateProjectTaskCountsBulk } from '../ProjectQueries.ts';

/**
 * Execution Listener for Project Task counts.
 * Listens to aggregated signals from the Task aggregator.
 */
export class TaskAggregated_SyncProjectTaskCountListener {
    async init() {
        logger.info(
            '[TaskAggregated -> Project] Initializing Listener for tasks_count updates',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'project-task-count-group',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.SYNC_PROJECT_TASK_COUNT]:
                    this.handleTaskCountsChanged.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTaskCountsChanged(
        events: DomainEvent<{ projectId: string; delta: number }>[],
    ) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'project-task-count-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Consolidate multiple signals for the same project
            const updates = new Map<string, number>();
            for (const event of unprocessed) {
                const { projectId, delta } = event.data;
                updates.set(projectId, (updates.get(projectId) || 0) + delta);
            }

            logger.info(
                `[TaskAggregated -> Project] Syncing task counts for ${updates.size} projects`,
            );

            await updateProjectTaskCountsBulk(updates, trx);
        });
    }
}
