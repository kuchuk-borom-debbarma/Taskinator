import type { Transaction } from 'kysely';
import type { Database } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
import { purgeProjectMembersBatch } from '../ProjectQueries.ts';

/**
 * Execution Listener for Project Member removal.
 * Deletes the member records and repairs project-level member counters.
 */
export class ProjectAggregated_RemoveProjectMember {
    async init() {
        logger.info(
            '[ProjectAggregated -> Project] Initializing Listener for Member Removal',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'project-member-removal-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.REMOVE_PROJECT_MEMBER]:
                    this.handleMemberRemoved.bind(this),
            },
            { batch: true },
        );
    }

    private async handleMemberRemoved(
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
            `[ProjectAggregated -> Project] Performing batch member purging for ${deltas.length} projects`,
        );

        try {
            // Purge memberships (The counter is repaired by a dedicated ChangeProjectMemberCount listener)
            const { affectedProjectMemberCounts } =
                await purgeProjectMembersBatch(deltas, trx);

            logger.info(
                `[ProjectAggregated -> Project] Successfully purged ${affectedProjectMemberCounts.size} membership types across ${deltas.length} projects`,
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
