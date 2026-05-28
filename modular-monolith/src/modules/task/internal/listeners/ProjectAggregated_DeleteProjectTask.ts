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
 * Execution Listener: Delete Project Task (Chunked)
 *
 * Processes project task deletion in bounded chunks to prevent long-lived
 * database locks. Each transaction deletes at most BULK_DELETE_CHUNK_SIZE rows.
 * If rows remain, a continuation signal (DELETE_PROJECT_TASK_CHUNK) is written
 * to the outbox atomically before commit, creating a self-signaling loop.
 *
 * [Action]: DELETE_PROJECT_TASK | DELETE_PROJECT_TASK_CHUNK
 */
export class ProjectAggregated_DeleteProjectTask {
    async init() {
        logger.info(
            '[ProjectAggregated -> Task] Initializing Listener: Delete Project Task (Chunked)',
        );

        await eventBus.subscribe(
            EVENT_STREAMS.PROJECT_AGGREGATED,
            'task-decommissioning-group',
            {
                // Initial trigger from the Project aggregator
                [EVENT_TYPES.PROJECT_AGGREGATED.DELETE_PROJECT_TASK]:
                    this.handleDeleteProjectTask.bind(this),
                // Self-signaling continuation when a chunk finishes but rows remain
                [EVENT_TYPES.PROJECT_AGGREGATED.DELETE_PROJECT_TASK_CHUNK]:
                    this.handleDeleteProjectTask.bind(this),
            },
            { batch: true },
        );
    }

    private async handleDeleteProjectTask(
        events: DomainEvent<{ projectIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await traceMethod(
            {
                containerId: 'task-module',
                containerName: 'Task Module',
                containerType: 'Logical Domain Module',
                name: 'listener.handleDeleteProjectTask',
                incomingTrace: events[0]?.traceContext,
            },
            async () => {
                await taskService.handleDeleteProjectTask(events);
            },
        );
    }
}
