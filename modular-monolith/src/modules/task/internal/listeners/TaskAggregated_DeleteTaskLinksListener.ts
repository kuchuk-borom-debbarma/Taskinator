import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
import { taskService } from '../../index.ts';

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
        await taskService.handleDeleteTaskLinks(events);
    }
}
