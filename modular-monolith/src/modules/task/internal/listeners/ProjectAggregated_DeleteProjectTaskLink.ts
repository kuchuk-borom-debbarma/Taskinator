import type { Transaction } from 'kysely';
import type { Database } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
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
        trx?: Transaction<Database>,
    ) {
        if (events.length === 0) return;

        const projectIds = Array.from(
            new Set(events.flatMap((e) => e.data.projectIds)),
        );

        logger.info(
            `[ProjectAggregated -> Task] Decommissioning task links for ${projectIds.length} projects`,
        );

        try {
            const { affectedCount } = await deleteProjectTaskLinksBatch(
                projectIds,
                trx,
            );

            logger.info(
                `[ProjectAggregated -> Task] Successfully purged ${affectedCount} task link records`,
            );
        } catch (err) {
            logger.error(
                '[ProjectAggregated -> Task] Failed to decommission project task links:',
                err,
            );
            throw err;
        }
    }
}
