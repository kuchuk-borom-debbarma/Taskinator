import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import { appendEventsToOutbox } from '../../../../utils/event-bus/OutboxQueries.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import {
    BULK_DELETE_CHUNK_SIZE,
    deleteTaskReachabilityChunk,
    repairTaskReachabilityForProjects,
} from '../TaskQueries.ts';

/**
 * Task Aggregated Listener: Bulk Reachability Cleanup (Chunked)
 *
 * Triggered when tasks are deleted. Purges all reachability records involving
 * the deleted tasks in bounded chunks to prevent long-lived database locks.
 *
 * Repair strategy (DEFERRED — best for performance):
 * - Intermediate chunk passes ONLY delete rows. No repair is attempted yet
 *   because the purge is not complete; running the repair CTE mid-way would
 *   be wasted work and an extra expensive lock.
 * - The repair CTE runs EXACTLY ONCE on the final chunk (affectedCount <
 *   BULK_DELETE_CHUNK_SIZE), after all stale rows are gone and the closure
 *   table can be correctly rebuilt from the surviving task_link records.
 *
 * [Action]: DELETE_TASK_REACHABILITY | DELETE_TASK_REACHABILITY_CHUNK
 */
export class TaskAggregated_DeleteTaskReachabilityListener {
    async init() {
        logger.info(
            '[Task -> Bulk Reachability Listener] Initializing (Chunked)',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'task-bulk-reachability-group',
            {
                // Initial trigger from the Task aggregator
                [KAFKA_EVENTS.TASK_AGGREGATED.DELETE_TASK_REACHABILITY]:
                    this.handleBulkDelete.bind(this),
                // Self-signaling continuation when a chunk finishes but rows remain
                [KAFKA_EVENTS.TASK_AGGREGATED.DELETE_TASK_REACHABILITY_CHUNK]:
                    this.handleBulkDelete.bind(this),
            },
            { batch: true },
        );
    }

    private async handleBulkDelete(
        events: DomainEvent<{ taskIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-bulk-reachability-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Collect unique task IDs across the batch
            const taskIds = Array.from(
                new Set(unprocessed.flatMap((e) => e.data.taskIds)),
            );

            logger.info(
                `[Graph Engine] Purging reachability chunk for ${taskIds.length} tasks`,
            );

            // [3] Delete one bounded chunk. Returns affected count and which
            //     projects were touched (used to scope the repair on the final pass).
            const { affectedCount, affectedProjectIds } =
                await deleteTaskReachabilityChunk(trx, taskIds);

            logger.info(
                `[Graph Engine] Purged ${affectedCount} reachability rows across ${affectedProjectIds.length} projects`,
            );

            if (affectedCount === BULK_DELETE_CHUNK_SIZE) {
                // [4a] Chunk was full — more rows likely remain.
                //      Self-signal to continue. Do NOT repair yet.
                logger.info(
                    '[Graph Engine] Chunk full — deferring repair, emitting continuation signal',
                );
                await appendEventsToOutbox(trx, [
                    {
                        kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.TASK_AGGREGATED
                                .DELETE_TASK_REACHABILITY_CHUNK,
                            taskIds,
                        },
                    },
                ]);
            } else if (affectedProjectIds.length > 0) {
                // [4b] Final chunk (deleted fewer rows than the limit) — purge is
                //      complete. Now run the repair CTE exactly once, scoped only
                //      to the projects that had rows deleted in this entire run.
                logger.info(
                    `[Graph Engine] Final chunk complete — repairing closure for ${affectedProjectIds.length} projects`,
                );
                await repairTaskReachabilityForProjects(
                    trx,
                    affectedProjectIds,
                );
            }
        });
    }
}
