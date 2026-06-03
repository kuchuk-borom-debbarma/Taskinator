import { logger } from '../../../../infra/logger';
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
 * Processes transitive closure row deletion in bounded chunks to prevent
 * long-lived database locks. The repair CTE is intentionally deferred:
 * intermediate chunk passes only delete rows. On the FINAL chunk
 * (affectedCount < BULK_DELETE_CHUNK_SIZE), the entire purge is done
 * and the reachability table will be rebuilt by the separate link-layer
 * constraints (FK cascade). No explicit repair is needed here — by the
 * time project reachability is purged, the tasks and links are already gone.
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
                // Initial trigger from the Project aggregator
                [EVENT_TYPES.PROJECT_AGGREGATED
                    .DELETE_PROJECT_TASK_REACHABILITY]:
                    this.handleProjectReachabilityPurge.bind(this),
                // Self-signaling continuation when a chunk finishes but rows remain
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
        await taskService.handleDeleteProjectReachability(events);
    }
}
