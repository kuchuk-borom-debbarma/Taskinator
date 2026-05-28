import { logger } from '../../../../infra/logger';
import { traceMethod } from '../../../../infra/tracing.ts';
import eventBus from '../../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import {
    EVENT_STREAMS,
    EVENT_TYPES,
} from '../../../../infra/utils/event-bus/constants.ts';
import { taskService } from '../../index.ts';
import type { TaskReachabilityLinkChange } from '../../TaskService.ts';

/**
 * Task Aggregated Listener: Reachability Sync
 */
export class TaskAggregated_ReachabilitySyncListener {
    async init() {
        logger.info('[Task -> Reachability Listener] Initializing');

        await eventBus.subscribe(
            EVENT_STREAMS.TASK_AGGREGATED,
            'task-reachability-sync-group',
            {
                [EVENT_TYPES.TASK_AGGREGATED.SYNC_TASK_REACHABILITY]:
                    this.handleSync.bind(this),
            },
            { batch: true },
        );
    }

    private async handleSync(
        events: DomainEvent<{
            projectId: string;
            links: TaskReachabilityLinkChange[];
        }>[],
    ) {
        if (events.length === 0) return;

        await traceMethod(
            {
                containerId: 'task-module',
                containerName: 'Task Module',
                containerType: 'Logical Domain Module',
                name: 'listener.handleReachabilitySync',
                incomingTrace: events[0]?.traceContext,
            },
            async () => {
                await taskService.handleTaskReachabilitySync(events);
            },
        );
    }
}
