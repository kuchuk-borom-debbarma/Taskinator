import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { deleteProjectTeamBatch } from '../TeamQueries.ts';

/**
 * Execution Listener: Delete Project Team
 * Bulk decommissions team entities for specified projects.
 * [Action]: DELETE_PROJECT_TEAM
 */
export class ProjectAggregated_DeleteProjectTeam {
    async init() {
        logger.info(
            '[ProjectAggregated -> Team] Initializing Listener: Delete Project Team (Decommissioning)',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'team-decommissioning-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECT_TEAM]:
                    this.handleDeleteProjectTeam.bind(this),
            },
            { batch: true },
        );
    }

    private async handleDeleteProjectTeam(
        events: DomainEvent<{ projectIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'team-decommissioning-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Collect all unique project IDs from the batch
            const projectIds = Array.from(
                new Set(unprocessed.flatMap((e) => e.data.projectIds)),
            );

            logger.info(
                `[ProjectAggregated -> Team] Decommissioning teams for ${projectIds.length} projects (from ${unprocessed.length} events)`,
            );

            const { affectedCount } = await deleteProjectTeamBatch(
                projectIds,
                trx,
            );

            logger.info(
                `[ProjectAggregated -> Team] Successfully purged ${affectedCount} team entities`,
            );
        });
    }
}
