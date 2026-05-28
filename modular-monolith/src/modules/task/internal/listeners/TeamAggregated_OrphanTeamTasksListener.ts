import { logger } from '../../../../infra/logger';
import { traceMethod } from '../../../../infra/tracing.ts';
import eventBus from '../../../../infra/utils/EventBus.ts';
import {
    EVENT_STREAMS,
    EVENT_TYPES,
} from '../../../../infra/utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus/types.ts';
import { taskService } from '../../index.ts';

/**
 * Execution Listener: Orphan Team Tasks
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
        if (events.length === 0) return;

        await traceMethod(
            {
                containerId: 'task-module',
                containerName: 'Task Module',
                containerType: 'Logical Domain Module',
                name: 'listener.handleOrphanTeamTasks',
                incomingTrace: events[0]?.traceContext,
            },
            async () => {
                await taskService.handleOrphanTeamTasks(events);
            },
        );
    }
}
