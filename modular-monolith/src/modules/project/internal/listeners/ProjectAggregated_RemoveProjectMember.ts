import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
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
    ) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'project-member-removal-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Grouping events for batch query
            const projectMap = new Map<string, Set<string>>();

            for (const event of unprocessed) {
                const { projectId, userIds } = event.data;
                const existing = projectMap.get(projectId) || new Set<string>();
                userIds.forEach((id: string) => existing.add(id));
                projectMap.set(projectId, existing);
            }

            const deltas = Array.from(projectMap.entries()).map(
                ([projectId, userIdsSet]) => ({
                    projectId,
                    userIds: Array.from(userIdsSet),
                }),
            );

            logger.info(
                `[ProjectAggregated -> Project] Performing batch member removal for ${deltas.length} projects (from ${unprocessed.length} events)`,
            );

            const { affectedProjectMemberCounts } =
                await purgeProjectMembersBatch(deltas, trx);

            logger.info(
                `[ProjectAggregated -> Project] Successfully removed ${affectedProjectMemberCounts.size} membership types across ${deltas.length} projects`,
            );
        });
    }
}
