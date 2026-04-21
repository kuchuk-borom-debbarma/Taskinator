import type { Transaction } from 'kysely';
import type { Database } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { purgeProjectMembersBatch } from '../ProjectQueries.ts';

/**
 * Execution Listener: Remove Project Member
 * Specifically removes individual user memberships from a project.
 */
export class ProjectAggregated_RemoveProjectMember {
    async init() {
        logger.info(
            '[ProjectAggregated -> Project] Initializing Listener: Remove Member',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'project-member-removal-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.REMOVE_PROJECT_MEMBER]:
                    this.handleRemoveMember.bind(this),
            },
            { batch: true },
        );
    }

    private async handleRemoveMember(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
        trx?: Transaction<Database>,
    ) {
        if (events.length === 0) return;

        // Grouping events for batch query
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
            `[ProjectAggregated -> Project] Performing batch member removal for ${deltas.length} projects`,
        );

        try {
            const { affectedProjectMemberCounts } =
                await purgeProjectMembersBatch(deltas, trx);

            logger.info(
                `[ProjectAggregated -> Project] Successfully removed ${affectedProjectMemberCounts.size} membership types across ${deltas.length} projects`,
            );
        } catch (err) {
            logger.error(
                '[ProjectAggregated -> Project] Failed to process project member removal:',
                err,
            );
            throw err;
        }
    }
}
