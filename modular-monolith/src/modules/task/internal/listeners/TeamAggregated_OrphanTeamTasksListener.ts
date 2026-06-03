import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import {
    EVENT_STREAMS,
    EVENT_TYPES,
} from '../../../../infra/utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus/types.ts';
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
            EVENT_STREAMS.TEAM_AGGREGATED,
            'team-task-orphaning-group',
            {
                [EVENT_TYPES.TEAM_AGGREGATED.ORPHAN_TEAM_TASKS]:
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
