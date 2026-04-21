import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';

import { purgeProjectCoreAndMembersByProjectIds } from '../ProjectQueries.ts';

/**
 * Project Module Listener for Project Deletion.
 * Responsible for cleaning up core project data and members.
 */
export class ProjectDeleted_ProjectCleanupListener {
    async init() {
        logger.info(
            '[Project Module] Initializing ProjectDeleted Project Cleanup Listener',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'project-core-cleanup-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETED]:
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
                'project-core-cleanup-group',
            );
            if (approvedEvents.length === 0) return;

            const projectIds = approvedEvents.flatMap((e) => e.data.projectIds);

            logger.info(
                `[Project Module] Cleaning up core records for ${projectIds.length} deleted projects`,
            );

            // 2. Delegate to Project Repository
            await purgeProjectCoreAndMembersByProjectIds(trx, projectIds);
        });
    }
}
