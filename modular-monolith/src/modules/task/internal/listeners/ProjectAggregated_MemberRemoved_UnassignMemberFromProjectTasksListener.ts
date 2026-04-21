import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { unassignMembersFromProjectTasksBatch } from '../TaskQueries.ts';

/**
 * Execution Listener for Project Member removal (Task Cascade).
 * Unassigns the user from all tasks in the project.
 * Optimized for single-operation batch execution.
 */
export class ProjectAggregated_MemberRemoved_UnassignMemberFromProjectTasksListener {
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
            `[ProjectAggregated -> Task] Performing batch unassignment for ${deltas.length} projects in a single call`,
        );

        try {
            const { updatedCount } =
                await unassignMembersFromProjectTasksBatch(deltas);

            logger.info(
                `[ProjectAggregated -> Task] Successfully unassigned ${updatedCount} memberships from tasks across ${deltas.length} projects`,
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
