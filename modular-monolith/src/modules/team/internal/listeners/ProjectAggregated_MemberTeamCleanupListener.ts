import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { removeMembersFromProjectTeams } from '../TeamQueries.ts';

/**
 * Execution Listener for Project Member removal (Team Cascade).
 * Removes the user from all teams in the project.
 */
export class ProjectAggregated_MemberTeamCleanupListener {
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

        for (const event of events) {
            const { projectId, userIds } = event.data;

            logger.info(
                `[ProjectAggregated -> Team] Purging ${userIds.length} users from all teams in Project ${projectId}`,
            );

            try {
                const { affectedTeamCount } =
                    await removeMembersFromProjectTeams(projectId, userIds);

                logger.info(
                    `[ProjectAggregated -> Team] Successfully cascaded removal to ${affectedTeamCount} teams in Project ${projectId}`,
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
}
