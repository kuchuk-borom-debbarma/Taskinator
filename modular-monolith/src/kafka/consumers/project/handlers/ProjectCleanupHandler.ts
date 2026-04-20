import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Signals project deletion cleanup to other modules.
 */
export class ProjectCleanupHandler {
    name = 'ProjectCleanupHandler';

    async handle(deletedProjectIds: string[]): Promise<void> {
        if (deletedProjectIds.length === 0) return;

        logger.info(
            `[${this.name}] Signal detected for ${deletedProjectIds.length} deleted projects. Triggering cross-module cleanup.`,
        );

        await eventBus.publish(
            KAFKA_TOPICS.PROJECT_AGGREGATED,
            KAFKA_EVENTS.PROJECT_AGGREGATED.DELETED,
            {
                key: 'cleanup-batch',
                data: { projectIds: deletedProjectIds },
            },
        );
    }
}
