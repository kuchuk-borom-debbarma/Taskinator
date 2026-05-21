import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { taskService } from '../../index.ts';

/**
 * Execution Listener: Orphan Team Tasks
 * Handles the orphaning of tasks (removing team/member associations)
 * when a team is deleted.
 */
export class TeamAggregated_OrphanTeamTasksListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Task] Initializing Listener: Orphan Team Tasks',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            'team-task-orphaning-group',
            {
                [KAFKA_EVENTS.TEAM_AGGREGATED.ORPHAN_TEAM_TASKS]:
                    this.handleOrphanTeamTasks.bind(this),
            },
            { batch: true },
        );
    }

    private async handleOrphanTeamTasks(
        events: DomainEvent<{ teamIds: string[] }>[],
    ) {
        await taskService.handleOrphanTeamTasks(events);
    }
}
