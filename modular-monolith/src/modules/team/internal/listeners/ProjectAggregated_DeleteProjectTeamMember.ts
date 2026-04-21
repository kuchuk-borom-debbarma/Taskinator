import type { Transaction } from 'kysely';
import type { Database } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { deleteProjectTeamMemberBatch } from '../TeamQueries.ts';

/**
 * Execution Listener: Delete Project Team Member
 * Bulk decommissions team membership records for specified projects.
 * [Action]: DELETE_PROJECT_TEAM_MEMBER
 */
export class ProjectAggregated_DeleteProjectTeamMember {
    async init() {
        logger.info(
            '[ProjectAggregated -> Team] Initializing Listener: Delete Project Team Member (Decommissioning)',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'team-membership-decommissioning-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECT_TEAM_MEMBER]:
                    this.handleDeleteProjectTeamMember.bind(this),
            },
            { batch: true },
        );
    }

    private async handleDeleteProjectTeamMember(
        events: DomainEvent<{ projectIds: string[] }>[],
        trx?: Transaction<Database>,
    ) {
        if (events.length === 0) return;

        const projectIds = Array.from(
            new Set(events.flatMap((e) => e.data.projectIds)),
        );

        logger.info(
            `[ProjectAggregated -> Team] Decommissioning team members for ${projectIds.length} projects`,
        );

        try {
            const { affectedCount } = await deleteProjectTeamMemberBatch(
                projectIds,
                trx,
            );

            logger.info(
                `[ProjectAggregated -> Team] Successfully purged ${affectedCount} team membership records`,
            );
        } catch (err) {
            logger.error(
                '[ProjectAggregated -> Team] Failed to decommission project team members:',
                err,
            );
            throw err;
        }
    }
}
