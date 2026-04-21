import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import {
    deleteReachabilityByTaskIds,
    deleteTaskLinksByTaskIds,
} from '../TaskQueries.ts';

/**
 * Listens for aggregated task deletion signals and cleans up secondary tables.
 * Purges direct links and transitive reachability rows.
 */
export class TaskAggregated_Deleted_PurgeTaskNetworkListener {
    async init() {
        logger.info(
            '[Task Module] Monitoring TASK_AGGREGATED.DELETED for cascading cleanups',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'individual-task-cleanup-group',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.DELETED]:
                    this.handleCleanup.bind(this),
            },
            { batch: true },
        );
    }

    private async handleCleanup(events: DomainEvent[]) {
        if (events.length === 0) return;

        // Collect all taskIds from all events in the batch
        const allTaskIds = events.flatMap(
            (event) => event.data.taskIds as string[],
        );

        if (allTaskIds.length === 0) return;

        logger.info(
            `[Task Module] Purging network data for ${allTaskIds.length} tasks`,
        );

        try {
            await Promise.all([
                deleteTaskLinksByTaskIds(allTaskIds),
                deleteReachabilityByTaskIds(allTaskIds),
            ]);

            logger.info(
                `[Task Module] Successfully cleaned up links and reachability for ${allTaskIds.length} tasks`,
            );
        } catch (error) {
            logger.error(
                '[Task Module] Failed to perform cascading task cleanup:',
                error,
            );
            throw error;
        }
    }
}
