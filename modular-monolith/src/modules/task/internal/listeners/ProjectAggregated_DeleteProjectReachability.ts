import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import { appendEventsToOutbox } from '../../../../utils/event-bus/OutboxQueries.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import {
    BULK_DELETE_CHUNK_SIZE,
    deleteProjectTaskReachabilityChunk,
} from '../TaskQueries.ts';

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
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'task-project-reachability-purge-group',
            {
                // Initial trigger from the Project aggregator
                [KAFKA_EVENTS.PROJECT_AGGREGATED
                    .DELETE_PROJECT_TASK_REACHABILITY]:
                    this.handleProjectReachabilityPurge.bind(this),
                // Self-signaling continuation when a chunk finishes but rows remain
                [KAFKA_EVENTS.PROJECT_AGGREGATED
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

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            // Previously missing — added as part of the chunking refactor.
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-project-reachability-purge-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Collect unique project IDs
            const projectIds = Array.from(
                new Set(unprocessed.flatMap((e) => e.data.projectIds)),
            );

            // [3] Delete one bounded chunk
            const { affectedCount } = await deleteProjectTaskReachabilityChunk(
                projectIds,
                trx,
            );

            logger.info(
                `[Graph Engine] Purged chunk of ${affectedCount} reachability rows for ${projectIds.length} projects`,
            );

            // [4] If the chunk was full, more rows may remain — self-signal to continue
            if (affectedCount === BULK_DELETE_CHUNK_SIZE) {
                logger.info(
                    '[Graph Engine] Chunk full — emitting continuation signal for reachability purge',
                );
                await appendEventsToOutbox(trx, [
                    {
                        kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.PROJECT_AGGREGATED
                                .DELETE_PROJECT_TASK_REACHABILITY_CHUNK,
                            projectIds,
                        },
                    },
                ]);
            }
        });
    }
}
