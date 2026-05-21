import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import type { DomainEvent } from '../../../../utils/event-bus';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../../utils/event-bus';
import { authService } from '../../index.ts';

/**
 * Execution Listener
 *
 * This performs the actual bulk SQL updates against the 'users' table in the database
 * once the events have been aggregated and folded.
 */
export class ProjectAggregated_ChangeUserProjectCount {
    async init() {
        logger.info(
            '[ProjectAggregated -> Auth] Initializing Listener for users project counts',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'auth-project-aggregator-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.CHANGE_USER_PROJECT_COUNT]:
                    this.handleAggregatedCounts.bind(this),
            },
            { batch: true },
        );
    }

    private async handleAggregatedCounts(
        events: DomainEvent<{ userId: string; delta: number }>[],
    ) {
        if (events.length === 0) return;

        await authService.handleUserProjectCountSync(events);
    }
}
