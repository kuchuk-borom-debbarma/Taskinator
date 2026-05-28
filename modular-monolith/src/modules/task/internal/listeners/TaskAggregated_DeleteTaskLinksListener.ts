import { logger } from '../../../../infra/logger';
import { traceMethod } from '../../../../infra/tracing.ts';
import eventBus from '../../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import { EVENT_STREAMS, EVENT_TYPES } from '../../../../infra/utils/event-bus';
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
            EVENT_STREAMS.TASK_AGGREGATED,
            'task-link-cleanup-group',
            {
                [EVENT_TYPES.TASK_AGGREGATED.DELETE_TASK_LINKS]:
                    this.handleTaskLinksDeleted.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTaskLinksDeleted(
        events: DomainEvent<{ taskIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await traceMethod(
            {
                containerId: 'task-module',
                containerName: 'Task Module',
                containerType: 'Logical Domain Module',
                name: 'listener.handleTaskLinksDeleted',
                incomingTrace: events[0]?.traceContext,
            },
            async () => {
                await taskService.handleDeleteTaskLinks(events);
            },
        );
    }
}
