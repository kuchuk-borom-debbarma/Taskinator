import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Signals team deletion cleanup to other modules.
 */
export class TeamCleanupHandler {
    name = 'TeamCleanupHandler';

    async handle(deletedTeamIds: string[]): Promise<void> {
        if (deletedTeamIds.length === 0) return;

        logger.info(
            `[${this.name}] Signal detected for ${deletedTeamIds.length} deleted teams. Triggering cross-module cleanup.`,
        );

        await eventBus.publish(
            KAFKA_TOPICS.TEAM_AGGREGATED,
            KAFKA_EVENTS.TEAM_AGGREGATED.DELETED,
            {
                key: 'team-cleanup-batch',
                data: { teamIds: deletedTeamIds },
            },
        );
    }
}
