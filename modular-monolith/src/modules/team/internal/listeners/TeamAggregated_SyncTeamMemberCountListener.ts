import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import { incrementTeamMemberCountsBulk } from '../TeamQueries.ts';

/**
 * Execution Listener for Team Member counts.
 * Listens to aggregated signals from the Team aggregator.
 */
export class TeamAggregated_SyncTeamMemberCountListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Team] Initializing Listener for members_count updates',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            'team-member-count-group',
            {
                [KAFKA_EVENTS.TEAM_AGGREGATED.SYNC_TEAM_MEMBER_COUNT]:
                    this.handleSyncTeamMemberCount.bind(this),
            },
            { batch: true },
        );
    }

    private async handleSyncTeamMemberCount(
        events: DomainEvent<{ teamId: string; delta: number }>[],
    ) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'team-member-count-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Consolidate multiple events for the same team into a single delta
            const updates = new Map<string, number>();
            for (const event of unprocessed) {
                const { teamId, delta } = event.data;
                updates.set(teamId, (updates.get(teamId) || 0) + delta);
            }

            logger.info(
                `[TeamAggregated -> Team] Performing bulk update for ${updates.size} teams (from ${unprocessed.length} events)`,
            );

            await incrementTeamMemberCountsBulk(trx, updates);
        });
    }
}
