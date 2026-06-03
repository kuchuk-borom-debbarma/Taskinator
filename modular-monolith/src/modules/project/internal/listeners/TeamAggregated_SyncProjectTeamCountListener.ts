import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import { EVENT_STREAMS, EVENT_TYPES } from '../../../../infra/utils/event-bus';
import { projectService } from '../../index.ts';

/**
 * Execution Listener for Project Team counts.
 * Listens to aggregated signals from the Team aggregator.
 */
export class TeamAggregated_SyncProjectTeamCountListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Project] Initializing Listener for teams_count updates',
        );

        await eventBus.subscribe(
            EVENT_STREAMS.TEAM_AGGREGATED,
            'project-team-count-group',
            {
                [EVENT_TYPES.TEAM_AGGREGATED.SYNC_PROJECT_TEAM_COUNT]:
                    this.handleSyncProjectTeamCount.bind(this),
            },
            { batch: true },
        );
    }

    private async handleSyncProjectTeamCount(
        events: DomainEvent<{ projectId: string; delta: number }>[],
    ) {
        if (events.length === 0) return;

        await projectService.handleSyncProjectTeamCount(events);
    }
}
