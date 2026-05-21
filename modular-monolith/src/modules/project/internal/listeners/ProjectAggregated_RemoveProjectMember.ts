import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { projectService } from '../../index.ts';

/**
 * Execution Listener: Remove Project Member
 * Specifically removes individual user memberships from a project.
 */
export class ProjectAggregated_RemoveProjectMember {
    async init() {
        logger.info(
            '[ProjectAggregated -> Project] Initializing Listener: Remove Member',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'project-member-removal-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.REMOVE_PROJECT_MEMBER]:
                    this.handleRemoveMember.bind(this),
            },
            { batch: true },
        );
    }

    private async handleRemoveMember(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await projectService.handleRemoveProjectMember(events);
    }
}
