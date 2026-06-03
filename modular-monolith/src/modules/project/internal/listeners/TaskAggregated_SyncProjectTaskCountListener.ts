import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import { EVENT_STREAMS, EVENT_TYPES } from '../../../../infra/utils/event-bus';
import { projectService } from '../../index.ts';

/**
 * Execution Listener for Project Task counts.
 * Listens to aggregated signals from the Task aggregator.
 */
export class TaskAggregated_SyncProjectTaskCountListener {
    async init() {
        logger.info(
            '[TaskAggregated -> Project] Initializing Listener for tasks_count updates',
        );

        await eventBus.subscribe(
            EVENT_STREAMS.TASK_AGGREGATED,
            'project-task-count-group',
            {
                [EVENT_TYPES.TASK_AGGREGATED.SYNC_PROJECT_TASK_COUNT]:
                    this.handleTaskCountsChanged.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTaskCountsChanged(
        events: DomainEvent<{ projectId: string; delta: number }>[],
    ) {
        if (events.length === 0) return;

        await projectService.handleSyncProjectTaskCount(events);
    }
}
