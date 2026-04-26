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
    deleteProjectTasksChunk,
} from '../TaskQueries.ts';

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
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-decommissioning-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Collect unique project IDs from the batch
            const projectIds = Array.from(
                new Set(unprocessed.flatMap((e) => e.data.projectIds)),
            );

            // [3] Delete one bounded chunk
            const { affectedCount } = await deleteProjectTasksChunk(
                projectIds,
                trx,
            );

            logger.info(
                `[ProjectAggregated -> Task] Deleted chunk of ${affectedCount} tasks for ${projectIds.length} projects`,
            );

            // [4] If the chunk was full, more rows may remain — self-signal to continue
            if (affectedCount === BULK_DELETE_CHUNK_SIZE) {
                logger.info(
                    '[ProjectAggregated -> Task] Chunk full — emitting continuation signal',
                );
                await appendEventsToOutbox(trx, [
                    {
                        kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.PROJECT_AGGREGATED
                                .DELETE_PROJECT_TASK_CHUNK,
                            projectIds,
                        },
                    },
                ]);
            }
        });
    }
}
