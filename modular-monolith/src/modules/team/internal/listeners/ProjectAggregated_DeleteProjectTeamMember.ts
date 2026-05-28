import { logger } from '../../../../infra/logger';
import { traceMethod } from '../../../../infra/tracing.ts';
import eventBus from '../../../../infra/utils/EventBus.ts';
import {
    EVENT_STREAMS,
    EVENT_TYPES,
} from '../../../../infra/utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus/types.ts';
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
            EVENT_STREAMS.PROJECT_AGGREGATED,
            'team-membership-decommissioning-group',
            {
                [EVENT_TYPES.PROJECT_AGGREGATED.DELETE_PROJECT_TEAM_MEMBER]:
                    this.handleDeleteProjectTeamMember.bind(this),
            },
            { batch: true },
        );
    }

    private async handleDeleteProjectTeamMember(
        events: DomainEvent<{ projectIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await traceMethod(
            {
                containerId: 'team-module',
                containerName: 'Team Module',
                containerType: 'Logical Domain Module',
                name: 'listener.handleDeleteProjectTeamMember',
                incomingTrace: events[0]?.traceContext,
            },
            async () => {
                await teamService.handleDeleteProjectTeamMember(events);
            },
        );
    }
}
