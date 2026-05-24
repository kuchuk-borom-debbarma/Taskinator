import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
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
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'task-link-decommissioning-group',
            {
                // Initial trigger from the Project aggregator
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECT_TASK_LINK]:
                    this.handleDeleteProjectTaskLink.bind(this),
                // Self-signaling continuation when a chunk finishes but rows remain
                [KAFKA_EVENTS.PROJECT_AGGREGATED
                    .DELETE_PROJECT_TASK_LINK_CHUNK]:
                    this.handleDeleteProjectTaskLink.bind(this),
            },
            { batch: true },
        );
    }

    private async handleDeleteProjectTaskLink(
        events: DomainEvent<{ projectIds: string[] }>[],
    ) {
        await taskService.handleDeleteProjectTaskLink(events);
    }
}
