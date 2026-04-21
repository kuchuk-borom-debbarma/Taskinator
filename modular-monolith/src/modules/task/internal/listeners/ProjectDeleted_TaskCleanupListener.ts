import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { db } from '../../../../database';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';

import { purgeTaskDataByProjectIds } from '../TaskQueries.ts';

/**
 * Task Module Listener for Project Deletion.
 * Responsible for cleaning up all task-related data when a project is removed.
 */
export class ProjectDeleted_TaskCleanupListener {
    async init() {
        logger.info(
            '[Task Module] Initializing ProjectDeleted Task Cleanup Listener',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'task-project-cleanup-group',
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
                'task-project-cleanup-group',
            );
            if (approvedEvents.length === 0) return;

            const projectIds = approvedEvents.flatMap((e) => e.data.projectIds);

            logger.info(
                `[Task Module] Cleaning up data for ${projectIds.length} deleted projects`,
            );

            // 2. Delegate to Task Repository
            await purgeTaskDataByProjectIds(trx, projectIds);
        });
    }
}
