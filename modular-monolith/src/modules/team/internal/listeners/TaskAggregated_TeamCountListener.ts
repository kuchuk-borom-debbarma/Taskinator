import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { updateTeamTaskCountsBulk } from '../TeamQueries.ts';

/**
 * Listens for aggregated task count changes and updates project_team table.
 */
export class TaskAggregated_TeamCountListener {
    async init() {
        logger.info('[Team Module] Monitoring TASK_AGGREGATED.COUNTS_CHANGED');

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'team-task-count-sync',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.COUNTS_CHANGED]:
                    this.handleCounts.bind(this),
            },
            { batch: true },
        );
    }

    private async handleCounts(events: DomainEvent[]) {
        if (events.length === 0) return;

        const teamDeltas = new Map<string, number>();

        for (const event of events) {
            if (event.data.type === 'TEAM') {
                const { teamId, delta } = event.data;
                teamDeltas.set(teamId, (teamDeltas.get(teamId) || 0) + delta);
            }
        }

        if (teamDeltas.size === 0) return;

        logger.info(
            `[Team Module] Repairing counters for ${teamDeltas.size} teams`,
        );

        try {
            await updateTeamTaskCountsBulk(teamDeltas);
        } catch (error) {
            logger.error('[Team Module] Failed to update task counts:', error);
            throw error;
        }
    }
}
