import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { deleteProjectTasksByProjectIds } from '../TaskQueries.ts';

/**
 * Pure listener for Task cleanup.
 */
export class ProjectAggregated_Deleted_DeleteTasksByProjectIdsListener {
    async init() {
        logger.info(
            '[ProjectAggregated -> Task Cleanup] Initializing Listener for project_task table',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'task-project-cleanup-group',
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
            `[Task Cleanup] Purging project_task for ${projectIds.length} projects`,
        );

        try {
            const { deletedCount } =
                await deleteProjectTasksByProjectIds(projectIds);
            logger.info(
                `[Task Cleanup] Purged ${deletedCount} project_task rows`,
            );
        } catch (err) {
            logger.error('[Task Cleanup] Failed to purge project_task:', err);
            throw err; // Propagate for retry (Critical if links are still present)
        }
    }
}
