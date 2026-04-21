import type { Transaction } from 'kysely';
import type { Database } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
import { updateProjectTeamCountsBulk } from '../ProjectQueries.ts';

/**
 * Execution Listener for Project Team counts.
 * Listens to aggregated signals from the Team aggregator.
 */
export class TeamAggregated_SyncProjectTeamCountListener {
    async init() {
        logger.info(
            '[TeamAggregated -> Project] Initializing Listener for teams_count updates',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            'project-team-count-group',
            {
                [KAFKA_EVENTS.TEAM_AGGREGATED.SYNC_PROJECT_TEAM_COUNT]:
                    this.handleSyncProjectTeamCount.bind(this),
            },
            { batch: true },
        );
    }

    private async handleSyncProjectTeamCount(
        events: DomainEvent<{ projectId: string; delta: number }>[],
        trx?: Transaction<Database>,
    ) {
        if (events.length === 0) return;

        const updates = new Map<string, number>();
        for (const event of events) {
            const { projectId, delta } = event.data;
            updates.set(projectId, (updates.get(projectId) || 0) + delta);
        }

        logger.info(
            `[TeamAggregated -> Project] Performing bulk update for ${updates.size} projects`,
        );

        try {
            await updateProjectTeamCountsBulk(updates, trx);
        } catch (err) {
            logger.error(
                '[TeamAggregated -> Project] Failed to update team counts:',
                err,
            );
            throw err;
        }
    }
}
