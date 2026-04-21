import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { deleteProjectTaskLinksBatch } from '../TaskQueries.ts';

/**
 * Execution Listener: Delete Project Task Link
 * Bulk decommissions task link records for specified projects.
 * [Action]: DELETE_PROJECT_TASK_LINK
 */
export class ProjectAggregated_DeleteProjectTaskLink {
    async init() {
        logger.info(
            '[ProjectAggregated -> Task] Initializing Listener: Delete Project Task Link (Decommissioning)',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'task-link-decommissioning-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECT_TASK_LINK]:
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

            // [2] Collect all unique project IDs from the batch
            const projectIds = Array.from(
                new Set(unprocessed.flatMap((e) => e.data.projectIds)),
            );

            logger.info(
                `[ProjectAggregated -> Task] Decommissioning task links for ${projectIds.length} projects (from ${unprocessed.length} events)`,
            );

            const { affectedCount } = await deleteProjectTaskLinksBatch(
                projectIds,
                trx,
            );

            logger.info(
                `[ProjectAggregated -> Task] Successfully purged ${affectedCount} task link records`,
            );
        });
    }
}
