import type { Transaction } from 'kysely';
import type { Database } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { unassignProjectTaskMembersBatch } from '../TaskQueries.ts';

/**
 * Execution Listener: Unassign Project Task Member
 * Specifically clears the assignment (fk_member_id) for specific users across all tasks in a project.
 * [Action]: UNASSIGN_PROJECT_TASK_MEMBER
 */
export class ProjectAggregated_UnassignProjectTaskMember {
    async init() {
        logger.info(
            '[ProjectAggregated -> Task] Initializing Listener: Unassign Project Task Member',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'task-member-unassignment-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.UNASSIGN_PROJECT_TASK_MEMBER]:
                    this.handleUnassignProjectTaskMember.bind(this),
            },
            { batch: true },
        );
    }

    private async handleUnassignProjectTaskMember(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
        trx?: Transaction<Database>,
    ) {
        if (events.length === 0) return;

        // Grouping events for batch process efficiency (Folding same projectId entries)
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
            `[ProjectAggregated -> Task] Executing batch unassignment of task members for ${deltas.length} projects`,
        );

        try {
            const { affectedCount } = await unassignProjectTaskMembersBatch(
                deltas,
                trx,
            );

            logger.info(
                `[ProjectAggregated -> Task] Successfully unassigned members from ${affectedCount} tasks across ${deltas.length} projects`,
            );
        } catch (err) {
            logger.error(
                '[ProjectAggregated -> Task] Failed to unassign project task members:',
                err,
            );
            throw err;
        }
    }
}
