import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Publishes aggregated task count changes for Projects and Teams.
 */
export class TaskCountHandler {
    name = 'TaskCountHandler';

    async handle(
        projectIncrements: Map<string, number>,
        teamIncrements: Map<string, number>,
    ): Promise<void> {
        const pEntries = Array.from(projectIncrements.entries());
        const tEntries = Array.from(teamIncrements.entries());

        if (pEntries.length === 0 && tEntries.length === 0) return;

        logger.info(
            `[${this.name}] Dispatching counts: ${pEntries.length} projects, ${tEntries.length} teams`,
        );

        const eventsToPublish = [
            ...pEntries.map(([projectId, delta]) => ({
                key: projectId,
                data: { projectId, delta, type: 'PROJECT' },
            })),
            ...tEntries.map(([teamId, delta]) => ({
                key: teamId,
                data: { teamId, delta, type: 'TEAM' },
            })),
        ];

        await eventBus.publish(
            KAFKA_TOPICS.TASK_AGGREGATED,
            KAFKA_EVENTS.TASK_AGGREGATED.COUNTS_CHANGED,
            eventsToPublish,
        );
    }

    async handleMemberAssignments(
        assignments: Map<string, any[]>,
    ): Promise<void> {
        const entries = Array.from(assignments.entries());
        if (entries.length === 0) return;

        logger.info(
            `[${this.name}] Dispatching member assignment signals for ${entries.length} users`,
        );

        const eventsToPublish = entries.map(([userId, tasks]) => ({
            key: userId,
            data: { userId, tasks },
        }));

        await eventBus.publish(
            KAFKA_TOPICS.TASK_AGGREGATED,
            KAFKA_EVENTS.TASK_AGGREGATED.MEMBERS_CHANGED,
            eventsToPublish,
        );
    }
}
