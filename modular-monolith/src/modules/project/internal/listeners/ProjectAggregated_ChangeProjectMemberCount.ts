import { logger } from '../../../../infra/logger';
import { traceMethod } from '../../../../infra/tracing.ts';
import eventBus from '../../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import { EVENT_STREAMS, EVENT_TYPES } from '../../../../infra/utils/event-bus';
import { projectService } from '../../index.ts';

/**
 * Execution Listener for Project Member counts.
 * Listens to aggregated signals from the Project aggregator.
 */
export class ProjectAggregated_ChangeProjectMemberCount {
    async init() {
        logger.info(
            '[ProjectAggregated -> Project] Initializing Listener for members_count updates',
        );

        await eventBus.subscribe(
            EVENT_STREAMS.PROJECT_AGGREGATED,
            'project-member-count-group',
            {
                [EVENT_TYPES.PROJECT_AGGREGATED.CHANGE_PROJECT_MEMBER_COUNT]:
                    this.handleMemberCountsChanged.bind(this),
            },
            { batch: true },
        );
    }

    private async handleMemberCountsChanged(
        events: DomainEvent<{ projectId: string; delta: number }>[],
    ) {
        if (events.length === 0) return;

        await traceMethod(
            {
                containerId: 'project-module',
                containerName: 'Project Module',
                containerType: 'Logical Domain Module',
                name: 'listener.handleMemberCountsChanged',
                incomingTrace: events[0]?.traceContext,
            },
            async () => {
                await projectService.handleProjectMemberCountSync(events);
            },
        );
    }
}
