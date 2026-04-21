import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { removeMembersFromProjectTeamsBatch } from '../TeamQueries.ts';

/**
 * Execution Listener for Project Member removal (Team Cascade).
 * Removes the user from all teams in the project.
 * Optimized for single-operation batch execution.
 */
export class ProjectAggregated_MemberRemoved_RemoveMemberFromAllProjectTeamsListener {
    async init() {
        logger.info(
            '[ProjectAggregated -> Team] Initializing Listener for Member Removal cascade',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'project-member-team-cleanup-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.MEMBER_REMOVED]:
                    this.handleMemberRemoved.bind(this),
            },
            { batch: true },
        );
    }

    private async handleMemberRemoved(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        // Grouping to ensure unique projectId entries for the batch query
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
            `[ProjectAggregated -> Team] Performing batch member-team purging for ${deltas.length} projects in a single call`,
        );

        try {
            const { affectedTeamCount } =
                await removeMembersFromProjectTeamsBatch(deltas);

            logger.info(
                `[ProjectAggregated -> Team] Successfully cascaded removal to ${affectedTeamCount} teams across ${deltas.length} projects`,
            );
        } catch (err) {
            logger.error(
                '[ProjectAggregated -> Team] Failed to cascade member removal:',
                err,
            );
            throw err;
        }
    }
}
