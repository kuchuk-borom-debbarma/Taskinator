import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { unassignMembersFromProjectTasks } from '../TaskQueries.ts';

/**
 * Execution Listener for Project Member removal (Task Cascade).
 * Unassigns the user from all tasks in the project.
 */
export class ProjectAggregated_MemberTaskUnassignmentListener {
    async init() {
        logger.info(
            '[ProjectAggregated -> Task] Initializing Listener for Member Removal cascade',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'project-member-task-cleanup-group',
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
                `[ProjectAggregated -> Task] Unassigning ${userIds.length} users from all tasks in Project ${projectId}`,
            );

            try {
                const { updatedCount } = await unassignMembersFromProjectTasks(
                    projectId,
                    userIds,
                );

                logger.info(
                    `[ProjectAggregated -> Task] Successfully unassigned ${updatedCount} members from tasks in Project ${projectId}`,
                );
            } catch (err) {
                logger.error(
                    '[ProjectAggregated -> Task] Failed to unassign members from tasks:',
                    err,
                );
                throw err;
            }
        }
    }
}
