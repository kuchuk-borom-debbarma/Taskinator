import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
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
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'task-decommissioning-group',
            {
                // Initial trigger from the Project aggregator
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECT_TASK]:
                    this.handleDeleteProjectTask.bind(this),
                // Self-signaling continuation when a chunk finishes but rows remain
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECT_TASK_CHUNK]:
                    this.handleDeleteProjectTask.bind(this),
            },
            { batch: true },
        );
    }

    private async handleDeleteProjectTask(
        events: DomainEvent<{ projectIds: string[] }>[],
    ) {
        await taskService.handleDeleteProjectTask(events);
    }
}
