import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import { EVENT_STREAMS, EVENT_TYPES } from '../../../../infra/utils/event-bus';
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
            EVENT_STREAMS.PROJECT_AGGREGATED,
            'auth-project-aggregator-group',
            {
                [EVENT_TYPES.PROJECT_AGGREGATED.CHANGE_USER_PROJECT_COUNT]:
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
