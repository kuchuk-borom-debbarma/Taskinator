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
    deleteProjectTaskLinksChunk,
} from '../TaskQueries.ts';

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
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-link-decommissioning-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Collect unique project IDs from the batch
            const projectIds = Array.from(
                new Set(unprocessed.flatMap((e) => e.data.projectIds)),
            );

            // [3] Delete one bounded chunk
            const { affectedCount } = await deleteProjectTaskLinksChunk(
                projectIds,
                trx,
            );

            logger.info(
                `[ProjectAggregated -> Task] Deleted chunk of ${affectedCount} task links for ${projectIds.length} projects`,
            );

            // [4] If the chunk was full, more rows may remain — self-signal to continue
            if (affectedCount === BULK_DELETE_CHUNK_SIZE) {
                logger.info(
                    '[ProjectAggregated -> Task] Chunk full — emitting continuation signal for task links',
                );
                await appendEventsToOutbox(trx, [
                    {
                        kafka_topic: KAFKA_TOPICS.PROJECT_AGGREGATED,
                        payload: {
                            type: KAFKA_EVENTS.PROJECT_AGGREGATED
                                .DELETE_PROJECT_TASK_LINK_CHUNK,
                            projectIds,
                        },
                    },
                ]);
            }
        });
    }
}
