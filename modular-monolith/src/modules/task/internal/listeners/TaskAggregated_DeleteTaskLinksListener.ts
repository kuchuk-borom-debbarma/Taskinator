import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import { deleteTaskLinksByTaskIds } from '../TaskQueries.ts';

/**
 * Internal Listener for Task module graph cleanup.
 * Listens to Task aggregator to purge orphaned links when a task is deleted.
 */
export class TaskAggregated_DeleteTaskLinksListener {
    async init() {
        logger.info(
            '[TaskAggregated -> Task] Initializing Listener for task_link cleanup',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'task-link-cleanup-group',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.DELETE_TASK_LINKS]:
                    this.handleTaskLinksDeleted.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTaskLinksDeleted(
        events: DomainEvent<{ taskIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-link-cleanup-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Consolidate task IDs from all batch signals
            const allTaskIds = Array.from(
                new Set(unprocessed.flatMap((e) => e.data.taskIds)),
            );

            logger.info(
                `[TaskAggregated -> Task] Purging links for ${allTaskIds.length} tasks (from ${unprocessed.length} events)`,
            );

            await deleteTaskLinksByTaskIds(allTaskIds, trx);
        });
    }
}
