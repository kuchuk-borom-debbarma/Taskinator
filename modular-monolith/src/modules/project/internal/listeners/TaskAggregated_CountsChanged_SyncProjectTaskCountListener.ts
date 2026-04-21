import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { updateProjectTaskCountsBulk } from '../ProjectQueries.ts';

/**
 * Listens for aggregated task count changes and updates project table.
 */
export class TaskAggregated_CountsChanged_SyncProjectTaskCountListener {
    async init() {
        logger.info(
            '[Project Module] Monitoring TASK_AGGREGATED.COUNTS_CHANGED',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'project-task-count-sync',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.COUNTS_CHANGED]:
                    this.handleCounts.bind(this),
            },
            { batch: true },
        );
    }

    private async handleCounts(events: DomainEvent[]) {
        if (events.length === 0) return;

        const projectDeltas = new Map<string, number>();

        for (const event of events) {
            if (event.data.type === 'PROJECT') {
                const { projectId, delta } = event.data;
                projectDeltas.set(
                    projectId,
                    (projectDeltas.get(projectId) || 0) + delta,
                );
            }
        }

        if (projectDeltas.size === 0) return;

        logger.info(
            `[Project Module] Repairing counters for ${projectDeltas.size} projects`,
        );

        try {
            await updateProjectTaskCountsBulk(projectDeltas);
        } catch (error) {
            logger.error(
                '[Project Module] Failed to update task counts:',
                error,
            );
            throw error;
        }
    }
}
