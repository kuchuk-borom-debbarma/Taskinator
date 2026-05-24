import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import { EVENT_STREAMS, EVENT_TYPES } from '../../../../infra/utils/event-bus';
import { teamService } from '../../index.ts';

/**
 * Execution Listener for Team Task counts.
 * Listens to aggregated signals from the Task aggregator.
 */
export class TaskAggregated_SyncTeamTaskCountListener {
    async init() {
        logger.info(
            '[TaskAggregated -> Team] Initializing Listener for team tasks_count updates',
        );

        await eventBus.subscribe(
            EVENT_STREAMS.TASK_AGGREGATED,
            'team-task-count-group',
            {
                [EVENT_TYPES.TASK_AGGREGATED.SYNC_TEAM_TASK_COUNT]:
                    this.handleTeamTaskCountsChanged.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTeamTaskCountsChanged(
        events: DomainEvent<{ teamId: string; delta: number }>[],
    ) {
        await teamService.handleSyncTeamTaskCount(events);
    }
}
