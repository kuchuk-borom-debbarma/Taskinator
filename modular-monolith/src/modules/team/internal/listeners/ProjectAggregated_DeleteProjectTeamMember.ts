import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { teamService } from '../../index.ts';

/**
 * Execution Listener: Delete Project Team Member
 * Bulk decommissions team membership records for specified projects.
 * [Action]: DELETE_PROJECT_TEAM_MEMBER
 */
export class ProjectAggregated_DeleteProjectTeamMember {
    async init() {
        logger.info(
            '[ProjectAggregated -> Team] Initializing Listener: Delete Project Team Member (Decommissioning)',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'team-membership-decommissioning-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETE_PROJECT_TEAM_MEMBER]:
                    this.handleDeleteProjectTeamMember.bind(this),
            },
            { batch: true },
        );
    }

    private async handleDeleteProjectTeamMember(
        events: DomainEvent<{ projectIds: string[] }>[],
    ) {
        await teamService.handleDeleteProjectTeamMember(events);
    }
}
