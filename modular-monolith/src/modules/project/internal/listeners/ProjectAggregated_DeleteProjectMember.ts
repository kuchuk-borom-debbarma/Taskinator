import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { purgeProjectMembersByProjectIdsBatch } from '../ProjectQueries.ts';

/**
 * Execution Listener: Delete Project Member
 * Handles the full decommissioning of all members for specified project IDs.
 */
export class ProjectAggregated_DeleteProjectMember {
    async init() {
        logger.info(
            '[ProjectAggregated -> Project] Initializing Listener: Delete Member (Decommissioning)',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'project-decommissioning-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECT_MEMBER]:
                    this.handleDeleteProjectMember.bind(this),
            },
            { batch: true },
        );
    }

    private async handleDeleteProjectMember(
        events: DomainEvent<{ projectIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'project-decommissioning-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Collect all unique project IDs from the batch
            const projectIds = Array.from(
                new Set(unprocessed.flatMap((e) => e.data.projectIds)),
            );

            logger.info(
                `[ProjectAggregated -> Project] Decommissioning all members for ${projectIds.length} projects (from ${unprocessed.length} events)`,
            );

            const { affectedCount } =
                await purgeProjectMembersByProjectIdsBatch(projectIds, trx);

            logger.info(
                `[ProjectAggregated -> Project] Successfully deleted ${affectedCount} membership records during project decommissioning`,
            );
        });
    }
}
