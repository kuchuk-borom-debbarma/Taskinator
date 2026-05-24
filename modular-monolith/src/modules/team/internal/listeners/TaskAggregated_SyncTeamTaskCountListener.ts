import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../infra/utils/event-bus';
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
            KAFKA_TOPICS.TASK_AGGREGATED,
            'team-task-count-group',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.SYNC_TEAM_TASK_COUNT]:
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
