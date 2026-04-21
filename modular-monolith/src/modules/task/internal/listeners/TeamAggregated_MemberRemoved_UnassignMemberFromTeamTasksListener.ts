import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { unassignTeamMembersFromTasksBatch } from '../TaskQueries.ts';

/**
 * Execution Listener for Team Member removal (Task Cascade).
 * Unassigns the user from all tasks in the team.
 * Optimized for single-operation batch execution.
 */
export class TeamAggregated_MemberRemoved_UnassignMemberFromTeamTasksListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Task] Initializing Listener for Member Removal cascade',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            'team-member-task-cleanup-group',
            {
                [KAFKA_EVENTS.TEAM_AGGREGATED.MEMBER_REMOVED]:
                    this.handleMemberRemoved.bind(this),
            },
            { batch: true },
        );
    }

    private async handleMemberRemoved(
        events: DomainEvent<{ teamId: string; userIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        // Grouping to ensure unique teamId entries for the batch query
        const teamMap = new Map<string, Set<string>>();

        for (const event of events) {
            const { teamId, userIds } = event.data;
            const existing = teamMap.get(teamId) || new Set<string>();
            userIds.forEach((id) => existing.add(id));
            teamMap.set(teamId, existing);
        }

        const deltas = Array.from(teamMap.entries()).map(
            ([teamId, userIdsSet]) => ({
                teamId,
                userIds: Array.from(userIdsSet),
            }),
        );

        logger.info(
            `[TeamAggregated -> Task] Performing batch unassignment for ${deltas.length} teams in a single call`,
        );

        try {
            const { updatedCount } =
                await unassignTeamMembersFromTasksBatch(deltas);

            logger.info(
                `[TeamAggregated -> Task] Successfully unassigned ${updatedCount} memberships from tasks across ${deltas.length} teams`,
            );
        } catch (err) {
            logger.error(
                '[TeamAggregated -> Task] Failed to unassign members from tasks:',
                err,
            );
            throw err;
        }
    }
}
