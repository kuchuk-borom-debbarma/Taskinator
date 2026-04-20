import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { unassignTeamMembersFromTasks } from '../TaskQueries.ts';

/**
 * Execution Listener for Team Member removal (Task Cascade).
 * Unassigns the user from all tasks specifically within that team.
 */
export class TeamAggregated_MemberTaskUnassignmentListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Task] Initializing Listener for Team Member Removal cascade',
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

        for (const event of events) {
            const { teamId, userIds } = event.data;

            logger.info(
                `[TeamAggregated -> Task] Unassigning ${userIds.length} users from all tasks in Team ${teamId}`,
            );

            try {
                const { updatedCount } = await unassignTeamMembersFromTasks(
                    teamId,
                    userIds,
                );

                logger.info(
                    `[TeamAggregated -> Task] Successfully unassigned ${updatedCount} members from tasks in Team ${teamId}`,
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
}
