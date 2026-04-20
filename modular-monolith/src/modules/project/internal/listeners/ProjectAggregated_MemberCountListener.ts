import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { updateProjectMemberCountsBulk } from '../ProjectQueries.ts';

/**
 * Execution Listener for Project Member counts.
 * Listens to aggregated signals from the Project aggregator.
 */
export class ProjectAggregated_MemberCountListener {
    async init() {
        logger.info(
            '[ProjectAggregated -> Project] Initializing Listener for members_count updates',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            'project-member-count-group',
            {
                [KAFKA_EVENTS.PROJECT_AGGREGATED.MEMBER_COUNTS_CHANGED]:
                    this.handleMemberCountsChanged.bind(this),
            },
            { batch: true },
        );
    }

    private async handleMemberCountsChanged(
        events: DomainEvent<{ projectId: string; delta: number }>[],
    ) {
        if (events.length === 0) return;

        const updates = new Map<string, number>();
        for (const event of events) {
            const { projectId, delta } = event.data;
            updates.set(projectId, (updates.get(projectId) || 0) + delta);
        }

        logger.info(
            `[ProjectAggregated -> Project] Performing bulk update for ${updates.size} projects`,
        );

        try {
            await updateProjectMemberCountsBulk(updates);
        } catch (err) {
            logger.error(
                '[ProjectAggregated -> Project] Failed to update member counts:',
                err,
            );
            throw err;
        }
    }
}
