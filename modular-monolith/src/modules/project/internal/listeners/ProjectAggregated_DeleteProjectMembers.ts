import type { Transaction } from 'kysely';
import type { Database } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { purgeProjectMembersByProjectIdsBatch } from '../ProjectQueries.ts';

/**
 * Execution Listener: Delete Project Members
 * Handles the full decommissioning of all members for specified project IDs.
 */
export class ProjectAggregated_DeleteProjectMembers {
    async init() {
        logger.info(
            '[ProjectAggregated -> Project] Initializing Listener: Delete Project Members (Decommissioning)',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'project-decommissioning-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECT_MEMBERS]:
                    this.handleDeleteProjectMembers.bind(this),
            },
            { batch: true },
        );
    }

    private async handleDeleteProjectMembers(
        events: DomainEvent<{ projectIds: string[] }>[],
        trx?: Transaction<Database>,
    ) {
        if (events.length === 0) return;

        // Collect all unique project IDs from the batch
        const projectIds = Array.from(
            new Set(events.flatMap((e) => e.data.projectIds)),
        );

        logger.info(
            `[ProjectAggregated -> Project] Decommissioning all members for ${projectIds.length} projects`,
        );

        try {
            const { affectedCount } =
                await purgeProjectMembersByProjectIdsBatch(projectIds, trx);

            logger.info(
                `[ProjectAggregated -> Project] Successfully deleted ${affectedCount} membership records during project decommissioning`,
            );
        } catch (err) {
            logger.error(
                '[ProjectAggregated -> Project] Failed to decommission project members:',
                err,
            );
            throw err;
        }
    }
}
