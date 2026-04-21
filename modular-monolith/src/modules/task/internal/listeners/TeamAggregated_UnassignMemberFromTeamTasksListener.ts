import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { unassignMembersFromTeamTasksBatch } from '../TaskQueries.ts';

/**
 * Execution Listener: Unassign Member From Team Tasks
 * Handles surgical unassignment of specific users from tasks within a team
 * when those users leave the team.
 */
export class TeamAggregated_UnassignMemberFromTeamTasksListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Task] Initializing Listener: Unassign Member From Team Tasks',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            'team-task-unassignment-group',
            {
                [KAFKA_EVENTS.TEAM_AGGREGATED.UNASSIGN_MEMBER_FROM_TEAM_TASKS]:
                    this.handleUnassignMemberFromTeamTasks.bind(this),
            },
            { batch: true },
        );
    }

    private async handleUnassignMemberFromTeamTasks(
        events: DomainEvent<{ teamId: string; userIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'team-task-unassignment-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Process each event (since they might target different teams)
            // Note: We could group by teamId for more efficiency, but since
            // the aggregator already groups, these are usually distinct.
            for (const event of unprocessed) {
                const { teamId, userIds } = event.data;

                logger.info(
                    `[TeamAggregated -> Task] Unassigning ${userIds.length} users from tasks in team ${teamId}`,
                );

                await unassignMembersFromTeamTasksBatch(teamId, userIds, trx);
            }
        });
    }
}
