import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { deleteProjectTaskLinksByProjectIds } from '../TaskQueries.ts';

/**
 * Pure listener for Task Link cleanup.
 */
export class ProjectAggregated_Deleted_DeleteTaskLinksByProjectIdsListener {
    async init() {
        logger.info(
            '[ProjectAggregated -> Task Link Cleanup] Initializing Listener for project_task_link table',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'task-link-project-cleanup-group',
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
            `[Task Link Cleanup] Purging project_task_link for ${projectIds.length} projects`,
        );

        try {
            const { deletedCount } =
                await deleteProjectTaskLinksByProjectIds(projectIds);
            logger.info(
                `[Task Link Cleanup] Purged ${deletedCount} project_task_link rows`,
            );
        } catch (err) {
            logger.error(
                '[Task Link Cleanup] Failed to purge project_task_link:',
                err,
            );
            throw err;
        }
    }
}
