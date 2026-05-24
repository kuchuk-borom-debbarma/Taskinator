import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import {
    EVENT_STREAMS,
    EVENT_TYPES,
} from '../../../../infra/utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus/types.ts';
import { projectService } from '../../index.ts';

/**
 * Execution Listener: Delete Project Member
 * Handles the full decommissioning of all members for specified project IDs.
 */
export class ProjectAggregated_DeleteProjectMember {
    async init() {
        logger.info(
            '[ProjectAggregated -> Project] Initializing Listener: Delete Member (Decommissioning)',
        );

        await eventBus.subscribe(
            EVENT_STREAMS.PROJECT_AGGREGATED,
            'project-decommissioning-group',
            {
                [EVENT_TYPES.PROJECT_AGGREGATED.DELETE_PROJECT_MEMBER]:
                    this.handleDeleteProjectMember.bind(this),
            },
            { batch: true },
        );
    }

    private async handleDeleteProjectMember(
        events: DomainEvent<{ projectIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await projectService.handleDeleteProjectMember(events);
    }
}
