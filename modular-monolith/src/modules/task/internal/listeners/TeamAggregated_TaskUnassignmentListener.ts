import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { unassignTasksByTeamIds } from '../TaskQueries.ts';

/**
 * Execution Listener for Task Unassignment.
 * Triggered when a team is deleted.
 */
export class TeamAggregated_TaskUnassignmentListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Task] Initializing Listener for team-task orphaning',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            'team-task-unassignment-group',
            {
                [KAFKA_EVENTS.TEAM_AGGREGATED.DELETED]:
                    this.handleTeamDeletion.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTeamDeletion(
        events: DomainEvent<{ teamIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        const allTeamIds = new Set<string>();
        for (const event of events) {
            for (const id of event.data.teamIds) {
                allTeamIds.add(id);
            }
        }

        const teamIds = Array.from(allTeamIds);
        if (teamIds.length === 0) return;

        logger.info(
            `[TeamAggregated -> Task] Orphaning tasks for ${teamIds.length} deleted teams`,
        );

        try {
            const { updatedCount } = await unassignTasksByTeamIds(teamIds);
            logger.info(
                `[TeamAggregated -> Task] Successfully unassigned ${updatedCount} tasks`,
            );
        } catch (err) {
            logger.error(
                '[TeamAggregated -> Task] Failed to unassign tasks:',
                err,
            );
            throw err;
        }
    }
}
