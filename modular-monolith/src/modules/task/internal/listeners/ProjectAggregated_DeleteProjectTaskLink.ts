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
 * Execution Listener: Delete Project Task Link (Chunked)
 *
 * Processes project task link deletion in bounded chunks to prevent long-lived
 * database locks. Each transaction deletes at most BULK_DELETE_CHUNK_SIZE rows.
 * If rows remain, a continuation signal (DELETE_PROJECT_TASK_LINK_CHUNK) is
 * written to the outbox atomically before commit, creating a self-signaling loop.
 *
 * [Action]: DELETE_PROJECT_TASK_LINK | DELETE_PROJECT_TASK_LINK_CHUNK
 */
export class ProjectAggregated_DeleteProjectTaskLink {
    async init() {
        logger.info(
            '[ProjectAggregated -> Task] Initializing Listener: Delete Project Task Link (Chunked)',
        );

        await eventBus.subscribe(
            EVENT_STREAMS.PROJECT_AGGREGATED,
            'task-link-decommissioning-group',
            {
                // Initial trigger from the Project aggregator
                [EVENT_TYPES.PROJECT_AGGREGATED.DELETE_PROJECT_TASK_LINK]:
                    this.handleDeleteProjectTaskLink.bind(this),
                // Self-signaling continuation when a chunk finishes but rows remain
                [EVENT_TYPES.PROJECT_AGGREGATED.DELETE_PROJECT_TASK_LINK_CHUNK]:
                    this.handleDeleteProjectTaskLink.bind(this),
            },
            { batch: true },
        );
    }

    private async handleDeleteProjectTaskLink(
        events: DomainEvent<{ projectIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await traceMethod(
            {
                containerId: 'task-module',
                containerName: 'Task Module',
                containerType: 'Logical Domain Module',
                name: 'listener.handleDeleteProjectTaskLink',
                incomingTrace: events[0]?.traceContext,
            },
            async () => {
                await taskService.handleDeleteProjectTaskLink(events);
            },
        );
    }
}
