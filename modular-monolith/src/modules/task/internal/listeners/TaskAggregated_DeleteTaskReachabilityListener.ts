import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { deleteTaskReachabilityBulk } from '../TaskQueries.ts';

/**
 * Task Aggregated Listener: Bulk Reachability Cleanup
 *
 * Triggered when tasks are deleted.
 * Logic:
 * 1. Purges all reachability records involving the deleted tasks.
 * 2. Executes a recursive repair to restore transitive paths
 *    that were diverted (but not broken) by the deletion.
 */
export class TaskAggregated_DeleteTaskReachabilityListener {
    async init() {
        logger.info('[Task -> Bulk Reachability Listener] Initializing');

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'task-bulk-reachability-group',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.DELETE_TASK_REACHABILITY]:
                    this.handleBulkDelete.bind(this),
            },
        );
    }

    private async handleBulkDelete(data: any) {
        const { taskIds } = data;

        if (!taskIds || taskIds.length === 0) return;

        logger.info(
            `[Graph Engine] Purging reachability for ${taskIds.length} deleted tasks`,
        );

        await db.transaction().execute(async (trx) => {
            // Perform bulk purge and recursive repair
            await deleteTaskReachabilityBulk(trx, taskIds);
        });
    }
}
