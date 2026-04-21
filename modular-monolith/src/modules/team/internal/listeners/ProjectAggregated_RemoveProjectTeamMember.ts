import type { Transaction } from 'kysely';
import type { Database } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { removeProjectTeamMembersBatch } from '../TeamQueries.ts';

/**
 * Execution Listener: Remove Project Team Member
 * Purges specific users from all teams within a project and repairs the team's member count.
 * [Action]: REMOVE_PROJECT_TEAM_MEMBER
 */
export class ProjectAggregated_RemoveProjectTeamMember {
    async init() {
        logger.info(
            '[ProjectAggregated -> Team] Initializing Listener: Remove Project Team Member',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'team-project-member-purge-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.REMOVE_PROJECT_TEAM_MEMBER]:
                    this.handleRemoveProjectTeamMember.bind(this),
            },
            { batch: true },
        );
    }

    private async handleRemoveProjectTeamMember(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
        trx?: Transaction<Database>,
    ) {
        if (events.length === 0) return;

        // Grouping events for batch processing efficiency
        const projectMap = new Map<string, Set<string>>();
        for (const event of events) {
            const { projectId, userIds } = event.data;
            const existing = projectMap.get(projectId) || new Set<string>();
            userIds.forEach((id) => existing.add(id));
            projectMap.set(projectId, existing);
        }

        const deltas = Array.from(projectMap.entries()).map(
            ([projectId, userIdsSet]) => ({
                projectId,
                userIds: Array.from(userIdsSet),
            }),
        );

        logger.info(
            `[ProjectAggregated -> Team] Executing consolidated batch removal of memberships for ${deltas.length} projects`,
        );

        try {
            const { affectedProjectCount, affectedTeamCount } =
                await removeProjectTeamMembersBatch(deltas, trx);

            logger.info(
                `[ProjectAggregated -> Team] Successfully purged memberships across ${affectedProjectCount} projects and repaired ${affectedTeamCount} team counters`,
            );
        } catch (err) {
            logger.error(
                '[ProjectAggregated -> Team] Failed to process project team member removal:',
                err,
            );
            throw err;
        }
    }
}
