import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
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
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'project-member-count-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.CHANGE_PROJECT_MEMBER_COUNT]:
                    this.handleMemberCountsChanged.bind(this),
            },
            { batch: true },
        );
    }

    private async handleMemberCountsChanged(
        events: DomainEvent<{ projectId: string; delta: number }>[],
    ) {
        if (events.length === 0) return;

        await projectService.handleProjectMemberCountSync(events);
    }
}
