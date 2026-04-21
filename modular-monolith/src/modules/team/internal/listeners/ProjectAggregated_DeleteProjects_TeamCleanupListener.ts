import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';

import { purgeTeamDataByProjectIds } from '../TeamQueries.ts';

/**
 * Team Module Listener for Project Deletion.
 * Responsible for cleaning up all team-related data when a project is removed.
 */
export class ProjectAggregated_DeleteProjects_TeamCleanupListener {
    async init() {
        logger.info(
            '[Team Module] Initializing ProjectDeleted Team Cleanup Listener',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'team-project-cleanup-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECTS]:
                    this.handleProjectDeletion.bind(this),
            },
            { batch: true, manualIdempotency: true },
        );
    }

    private async handleProjectDeletion(events: DomainEvent[]) {
        if (events.length === 0) return;

        const allProjectIds = events.flatMap((e) => e.data.projectIds);
        if (allProjectIds.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // 1. Atomic Claim
            const approvedEvents = await claimEventsAtomic(
                trx,
                events,
                'team-project-cleanup-group',
            );
            if (approvedEvents.length === 0) return;

            const projectIds = approvedEvents.flatMap((e) => e.data.projectIds);

            logger.info(
                `[Team Module] Cleaning up team data for ${projectIds.length} deleted projects`,
            );

            // 2. Delegate to Team Repository
            await purgeTeamDataByProjectIds(trx, projectIds);
        });
    }
}
