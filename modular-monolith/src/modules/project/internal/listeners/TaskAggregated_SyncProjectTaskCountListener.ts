import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
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
            KAFKA_TOPICS.TASK_AGGREGATED,
            'project-task-count-group',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.SYNC_PROJECT_TASK_COUNT]:
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
