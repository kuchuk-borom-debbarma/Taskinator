import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import { EVENT_STREAMS, EVENT_TYPES } from '../../../../infra/utils/event-bus';
import { teamService } from '../../index.ts';

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
            EVENT_STREAMS.TEAM_AGGREGATED,
            'team-member-count-group',
            {
                [EVENT_TYPES.TEAM_AGGREGATED.SYNC_TEAM_MEMBER_COUNT]:
                    this.handleSyncTeamMemberCount.bind(this),
            },
            { batch: true },
        );
    }

    private async handleSyncTeamMemberCount(
        events: DomainEvent<{ teamId: string; delta: number }>[],
    ) {
        await teamService.handleSyncTeamMemberCount(events);
    }
}
