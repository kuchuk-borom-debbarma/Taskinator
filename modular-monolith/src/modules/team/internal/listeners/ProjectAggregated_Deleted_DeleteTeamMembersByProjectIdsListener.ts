import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { deleteProjectTeamMembersByProjectIds } from '../TeamQueries.ts';

/**
 * Pure listener for Team Member cleanup.
 */
export class ProjectAggregated_Deleted_DeleteTeamMembersByProjectIdsListener {
    async init() {
        logger.info(
            '[ProjectAggregated -> Team Member Cleanup] Initializing Listener for project_team_member table',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'team-member-project-cleanup-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.DELETED]:
                    this.handleProjectDeletions.bind(this),
            },
            { batch: true },
        );
    }

    private async handleProjectDeletions(
        events: DomainEvent<{ projectIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        const allProjectIds = new Set<string>();
        for (const event of events) {
            for (const id of event.data.projectIds) {
                allProjectIds.add(id);
            }
        }

        const projectIds = Array.from(allProjectIds);
        if (projectIds.length === 0) return;

        logger.info(
            `[Team Member Cleanup] Purging project_team_member for ${projectIds.length} projects`,
        );

        try {
            const { deletedCount } =
                await deleteProjectTeamMembersByProjectIds(projectIds);
            logger.info(
                `[Team Member Cleanup] Purged ${deletedCount} project_team_member rows`,
            );
        } catch (err) {
            logger.error(
                '[Team Member Cleanup] Failed to purge project_team_member:',
                err,
            );
            throw err;
        }
    }
}
