import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../infra/utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus/types.ts';
import { teamService } from '../../index.ts';

/**
 * Execution Listener: Remove Project Team Member
 * Purges specific users from all teams within a project and repairs the team's member count.
 * [Action]: REMOVE_PROJECT_TEAM_MEMBER
 */
export class ProjectAggregated_RemoveProjectTeamMember {
    async init() {
        logger.info(
            '[ProjectAggregated -> Team] Initializing Listener: Remove Project Team Member',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'team-project-member-purge-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.REMOVE_PROJECT_TEAM_MEMBER]:
                    this.handleRemoveProjectTeamMember.bind(this),
            },
            { batch: true },
        );
    }

    private async handleRemoveProjectTeamMember(
        events: DomainEvent<{ projectId: string; userIds: string[] }>[],
    ) {
        await teamService.handleRemoveProjectTeamMember(events);
    }
}
