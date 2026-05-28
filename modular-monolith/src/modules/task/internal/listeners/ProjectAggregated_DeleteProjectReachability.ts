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
 * Execution Listener: Delete Project Task Reachability (Chunked)
 *
 * [Action]: DELETE_PROJECT_TASK_REACHABILITY | DELETE_PROJECT_TASK_REACHABILITY_CHUNK
 */
export class ProjectAggregated_DeleteProjectReachability {
    async init() {
        logger.info(
            '[Task -> Project Cleanup] Initializing Listener: Delete Project Reachability (Chunked)',
        );

        await eventBus.subscribe(
            EVENT_STREAMS.PROJECT_AGGREGATED,
            'task-project-reachability-purge-group',
            {
                [EVENT_TYPES.PROJECT_AGGREGATED
                    .DELETE_PROJECT_TASK_REACHABILITY]:
                    this.handleProjectReachabilityPurge.bind(this),
                [EVENT_TYPES.PROJECT_AGGREGATED
                    .DELETE_PROJECT_TASK_REACHABILITY_CHUNK]:
                    this.handleProjectReachabilityPurge.bind(this),
            },
            { batch: true },
        );
    }

    private async handleProjectReachabilityPurge(
        events: DomainEvent<{ projectIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await traceMethod(
            {
                containerId: 'task-module',
                containerName: 'Task Module',
                containerType: 'Logical Domain Module',
                name: 'listener.handleProjectReachabilityPurge',
                incomingTrace: events[0]?.traceContext,
            },
            async () => {
                await taskService.handleDeleteProjectReachability(events);
            },
        );
    }
}
