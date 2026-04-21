import type { Transaction } from 'kysely';
import type { Database } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
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
        trx?: Transaction<Database>,
    ) {
        if (events.length === 0) return;

        const projectIds = Array.from(
            new Set(events.flatMap((e) => e.data.projectIds)),
        );

        logger.info(
            `[ProjectAggregated -> Team] Decommissioning teams for ${projectIds.length} projects`,
        );

        try {
            const { affectedCount } = await deleteProjectTeamBatch(
                projectIds,
                trx,
            );

            logger.info(
                `[ProjectAggregated -> Team] Successfully purged ${affectedCount} team entities`,
            );
        } catch (err) {
            logger.error(
                '[ProjectAggregated -> Team] Failed to decommission project teams:',
                err,
            );
            throw err;
        }
    }
}
