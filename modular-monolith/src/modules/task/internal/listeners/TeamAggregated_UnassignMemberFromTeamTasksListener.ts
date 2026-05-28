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
 * Execution Listener: Unassign Member From Team Tasks
 */
export class TeamAggregated_UnassignMemberFromTeamTasksListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Task] Initializing Listener: Unassign Member From Team Tasks',
        );

        await eventBus.subscribe(
            EVENT_STREAMS.TEAM_AGGREGATED,
            'team-task-unassignment-group',
            {
                [EVENT_TYPES.TEAM_AGGREGATED.UNASSIGN_MEMBER_FROM_TEAM_TASKS]:
                    this.handleUnassignMemberFromTeamTasks.bind(this),
            },
            { batch: true },
        );
    }

    private async handleUnassignMemberFromTeamTasks(
        events: DomainEvent<{ teamId: string; userIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await traceMethod(
            {
                containerId: 'task-module',
                containerName: 'Task Module',
                containerType: 'Logical Domain Module',
                name: 'listener.handleUnassignMemberFromTeamTasks',
                incomingTrace: events[0]?.traceContext,
            },
            async () => {
                await taskService.handleUnassignMemberFromTeamTasks(events);
            },
        );
    }
}
