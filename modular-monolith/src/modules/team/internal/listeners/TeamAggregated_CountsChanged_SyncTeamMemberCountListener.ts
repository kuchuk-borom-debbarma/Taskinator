import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { updateTeamMemberCountsBulk } from '../TeamQueries.ts';

/**
 * Execution Listener for Team Member counts.
 * Listens to aggregated signals from the Team aggregator.
 */
export class TeamAggregated_CountsChanged_SyncTeamMemberCountListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Team] Initializing Listener for members_count updates',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            'team-member-count-group',
            {
                [KAFKA_EVENTS.TEAM_AGGREGATED.TEAM_MEMBER_COUNTS_CHANGED]:
                    this.handleMemberCountsChanged.bind(this),
            },
            { batch: true },
        );
    }

    private async handleMemberCountsChanged(
        events: DomainEvent<{ teamId: string; delta: number }>[],
    ) {
        if (events.length === 0) return;

        const updates = new Map<string, number>();
        for (const event of events) {
            const { teamId, delta } = event.data;
            updates.set(teamId, (updates.get(teamId) || 0) + delta);
        }

        logger.info(
            `[TeamAggregated -> Team] Performing bulk update for ${updates.size} teams`,
        );

        try {
            await updateTeamMemberCountsBulk(updates);
        } catch (err) {
            logger.error(
                '[TeamAggregated -> Team] Failed to update member counts:',
                err,
            );
            throw err;
        }
    }
}
