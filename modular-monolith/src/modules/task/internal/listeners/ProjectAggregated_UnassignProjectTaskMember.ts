import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { taskService } from '../../index.ts';

/**
 * Execution Listener: Unassign Project Task Member
 * Specifically clears the assignment (fk_member_id) for specific users across all tasks in a project.
 * [Action]: UNASSIGN_PROJECT_TASK_MEMBER
 */
export class ProjectAggregated_UnassignProjectTaskMember {
    async init() {
        logger.info(
            '[ProjectAggregated -> Task] Initializing Listener: Unassign Project Task Member',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'task-member-unassignment-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.UNASSIGN_PROJECT_TASK_MEMBER]:
                    this.handleUnassignProjectTaskMember.bind(this),
            },
            { batch: true },
        );
    }

    private async handleUnassignProjectTaskMember(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
    ) {
        await taskService.handleUnassignProjectTaskMember(events);
    }
}
