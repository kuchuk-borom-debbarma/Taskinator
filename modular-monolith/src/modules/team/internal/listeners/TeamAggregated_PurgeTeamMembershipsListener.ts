import { logger } from '../../../../infra/logger';
import { traceMethod } from '../../../../infra/tracing.ts';
import eventBus from '../../../../infra/utils/EventBus.ts';
import {
    EVENT_STREAMS,
    EVENT_TYPES,
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
            EVENT_STREAMS.TEAM_AGGREGATED,
            'team-membership-purge-group',
            {
                [EVENT_TYPES.TEAM_AGGREGATED.PURGE_TEAM_MEMBERSHIPS]:
                    this.handlePurgeTeamMemberships.bind(this),
            },
            { batch: true },
        );
    }

    private async handlePurgeTeamMemberships(
        events: DomainEvent<{ teamIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await traceMethod(
            {
                containerId: 'team-module',
                containerName: 'Team Module',
                containerType: 'Logical Domain Module',
                name: 'listener.handlePurgeTeamMemberships',
                incomingTrace: events[0]?.traceContext,
            },
            async () => {
                await teamService.handlePurgeTeamMemberships(events);
            },
        );
    }
}
