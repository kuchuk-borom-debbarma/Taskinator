import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { orphanTasksByTeamIdsBatch } from '../TaskQueries.ts';

/**
 * Execution Listener: Orphan Team Tasks
 * Handles the orphaning of tasks (removing team/member associations)
 * when a team is deleted.
 */
export class TeamAggregated_OrphanTeamTasksListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Task] Initializing Listener: Orphan Team Tasks',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            'team-task-orphaning-group',
            {
                [KAFKA_EVENTS.TEAM_AGGREGATED.ORPHAN_TEAM_TASKS]:
                    this.handleOrphanTeamTasks.bind(this),
            },
            { batch: true },
        );
    }

    private async handleOrphanTeamTasks(
        events: DomainEvent<{ teamIds: string[] }>[],
    ) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'team-task-orphaning-group',
            );

            if (unprocessed.length === 0) return;

            // [2] Collect all unique team IDs from the batch
            const teamIds = Array.from(
                new Set(unprocessed.flatMap((e) => e.data.teamIds)),
            );

            logger.info(
                `[TeamAggregated -> Task] Orphaning tasks for ${teamIds.length} teams (from ${unprocessed.length} events)`,
            );

            const { affectedCount } = await orphanTasksByTeamIdsBatch(
                teamIds,
                trx,
            );

            logger.info(
                `[TeamAggregated -> Task] Successfully orphaned ${affectedCount} tasks`,
            );
        });
    }
}
