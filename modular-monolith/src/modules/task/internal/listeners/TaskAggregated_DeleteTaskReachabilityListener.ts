import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import {
    EVENT_STREAMS,
    EVENT_TYPES,
} from '../../../../infra/utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus/types.ts';
import { taskService } from '../../index.ts';

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
            EVENT_STREAMS.TASK_AGGREGATED,
            'task-bulk-reachability-group',
            {
                // Initial trigger from the Task aggregator
                [EVENT_TYPES.TASK_AGGREGATED.DELETE_TASK_REACHABILITY]:
                    this.handleBulkDelete.bind(this),
                // Self-signaling continuation when a chunk finishes but rows remain
                [EVENT_TYPES.TASK_AGGREGATED.DELETE_TASK_REACHABILITY_CHUNK]:
                    this.handleBulkDelete.bind(this),
            },
            { batch: true },
        );
    }

    private async handleBulkDelete(
        events: DomainEvent<{ taskIds: string[] }>[],
    ) {
        await taskService.handleDeleteTaskReachability(events);
    }
}
