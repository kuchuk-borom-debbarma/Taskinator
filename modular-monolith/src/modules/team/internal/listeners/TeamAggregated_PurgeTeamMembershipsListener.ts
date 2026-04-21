import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { purgeTeamMembershipsByTeamIdsBatch } from '../TeamQueries.ts';

/**
 * Execution Listener: Purge Team Memberships
 * Handles the full decommissioning of all members for specified team IDs
 * when a team is deleted.
 */
export class TeamAggregated_PurgeTeamMembershipsListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Team] Initializing Listener: Purge Team Memberships',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            'team-membership-purge-group',
            {
                [KAFKA_EVENTS.TEAM_AGGREGATED.PURGE_TEAM_MEMBERSHIPS]:
                    this.handlePurgeTeamMemberships.bind(this),
            },
            { batch: true },
        );
    }

    private async handlePurgeTeamMemberships(
        events: DomainEvent<{ teamIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'team-membership-purge-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Collect all unique team IDs from the batch
            const teamIds = Array.from(
                new Set(unprocessed.flatMap((e) => e.data.teamIds)),
            );

            logger.info(
                `[TeamAggregated -> Team] Purging memberships for ${teamIds.length} teams (from ${unprocessed.length} events)`,
            );

            const { affectedCount } = await purgeTeamMembershipsByTeamIdsBatch(
                teamIds,
                trx,
            );

            logger.info(
                `[TeamAggregated -> Team] Successfully deleted ${affectedCount} team membership records`,
            );
        });
    }
}
