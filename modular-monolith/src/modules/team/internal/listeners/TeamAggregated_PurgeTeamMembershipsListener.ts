import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../infra/utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus/types.ts';
import { teamService } from '../../index.ts';

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
        await teamService.handlePurgeTeamMemberships(events);
    }
}
