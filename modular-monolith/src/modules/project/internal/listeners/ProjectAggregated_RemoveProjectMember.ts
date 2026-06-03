import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import {
    EVENT_STREAMS,
    EVENT_TYPES,
} from '../../../../infra/utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus/types.ts';
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
            EVENT_STREAMS.PROJECT_AGGREGATED,
            'project-member-removal-group',
            {
                [EVENT_TYPES.PROJECT_AGGREGATED.REMOVE_PROJECT_MEMBER]:
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
