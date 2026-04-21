import type { Transaction } from 'kysely';
import type { Database } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { deleteProjectTasksBatch } from '../TaskQueries.ts';

/**
 * Execution Listener: Delete Project Task
 * Bulk decommissions task entities for specified projects.
 * [Action]: DELETE_PROJECT_TASK
 */
export class ProjectAggregated_DeleteProjectTask {
    async init() {
        logger.info(
            '[ProjectAggregated -> Task] Initializing Listener: Delete Project Task (Decommissioning)',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'task-decommissioning-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECT_TASK]:
                    this.handleDeleteProjectTask.bind(this),
            },
            { batch: true },
        );
    }

    private async handleDeleteProjectTask(
        events: DomainEvent<{ projectIds: string[] }>[],
        trx?: Transaction<Database>,
    ) {
        if (events.length === 0) return;

        const projectIds = Array.from(
            new Set(events.flatMap((e) => e.data.projectIds)),
        );

        logger.info(
            `[ProjectAggregated -> Task] Decommissioning tasks for ${projectIds.length} projects`,
        );

        try {
            const { affectedCount } = await deleteProjectTasksBatch(
                projectIds,
                trx,
            );

            logger.info(
                `[ProjectAggregated -> Task] Successfully purged ${affectedCount} task entities`,
            );
        } catch (err) {
            logger.error(
                '[ProjectAggregated -> Task] Failed to decommission project tasks:',
                err,
            );
            throw err;
        }
    }
}
