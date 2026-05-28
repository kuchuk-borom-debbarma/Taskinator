import { logger } from '../../../../infra/logger';
import { traceMethod } from '../../../../infra/tracing.ts';
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
                [EVENT_TYPES.TASK_AGGREGATED.DELETE_TASK_REACHABILITY]:
                    this.handleBulkDelete.bind(this),
                [EVENT_TYPES.TASK_AGGREGATED.DELETE_TASK_REACHABILITY_CHUNK]:
                    this.handleBulkDelete.bind(this),
            },
            { batch: true },
        );
    }

    private async handleBulkDelete(
        events: DomainEvent<{ taskIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await traceMethod(
            {
                containerId: 'task-module',
                containerName: 'Task Module',
                containerType: 'Logical Domain Module',
                name: 'listener.handleBulkDelete',
                incomingTrace: events[0]?.traceContext,
            },
            async () => {
                await taskService.handleDeleteTaskReachability(events);
            },
        );
    }
}
