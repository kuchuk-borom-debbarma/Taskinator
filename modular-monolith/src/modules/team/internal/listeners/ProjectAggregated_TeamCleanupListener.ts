import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { deleteTeamsByProjectIds } from '../TeamQueries.ts';

/**
 * Pure listener for Team cleanup.
 */
export class ProjectAggregated_TeamCleanupListener {
    async init() {
        logger.info(
            '[ProjectAggregated -> Team Cleanup] Initializing Listener for project_team table',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'team-project-cleanup-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETED]:
                    this.handleProjectDeletions.bind(this),
            },
            { batch: true },
        );
    }

    private async handleProjectDeletions(
        events: DomainEvent<{ projectIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        const allProjectIds = new Set<string>();
        for (const event of events) {
            for (const id of event.data.projectIds) {
                allProjectIds.add(id);
            }
        }

        const projectIds = Array.from(allProjectIds);
        if (projectIds.length === 0) return;

        logger.info(
            `[Team Cleanup] Purging project_team for ${projectIds.length} projects`,
        );

        try {
            const { deletedCount } = await deleteTeamsByProjectIds(projectIds);
            logger.info(
                `[Team Cleanup] Purged ${deletedCount} project_team rows`,
            );
        } catch (err) {
            logger.error('[Team Cleanup] Failed to purge project_team:', err);
            throw err; // Propagate for retry (Critical if members are still present)
        }
    }
}
//TODO batching to avoid db lock
