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
 * Execution Listener: Unassign Project Task Member
 * [Action]: UNASSIGN_PROJECT_TASK_MEMBER
 */
export class ProjectAggregated_UnassignProjectTaskMember {
    async init() {
        logger.info(
            '[ProjectAggregated -> Task] Initializing Listener: Unassign Project Task Member',
        );

        await eventBus.subscribe(
            EVENT_STREAMS.PROJECT_AGGREGATED,
            'task-member-unassignment-group',
            {
                [EVENT_TYPES.PROJECT_AGGREGATED.UNASSIGN_PROJECT_TASK_MEMBER]:
                    this.handleUnassignProjectTaskMember.bind(this),
            },
            { batch: true },
        );
    }

    private async handleUnassignProjectTaskMember(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await traceMethod(
            {
                containerId: 'task-module',
                containerName: 'Task Module',
                containerType: 'Logical Domain Module',
                name: 'listener.handleUnassignProjectTaskMember',
                incomingTrace: events[0]?.traceContext,
            },
            async () => {
                await taskService.handleUnassignProjectTaskMember(events);
            },
        );
    }
}
