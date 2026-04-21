import { db } from '../../../../database';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

/**
 * Publishes aggregated task count changes for Projects and Teams using the Transactional Outbox.
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
            `[${this.name}] Signaling counts via Outbox: ${pEntries.length} projects, ${tEntries.length} teams`,
        );

        const outboxEntries = [
            ...pEntries.map(([projectId, delta]) => ({
                kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                kafka_key: projectId,
                payload: {
                    type: KAFKA_EVENTS.TASK_AGGREGATED.COUNTS_CHANGED,
                    projectId,
                    delta,
                    entityType: 'PROJECT',
                },
            })),
            ...tEntries.map(([teamId, delta]) => ({
                kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                kafka_key: teamId,
                payload: {
                    type: KAFKA_EVENTS.TASK_AGGREGATED.COUNTS_CHANGED,
                    teamId,
                    delta,
                    entityType: 'TEAM',
                },
            })),
        ];

        await db.insertInto('outbox_events').values(outboxEntries).execute();
    }

    async handleMemberAssignments(
        assignments: Map<string, any[]>,
    ): Promise<void> {
        const entries = Array.from(assignments.entries());
        if (entries.length === 0) return;

        logger.info(
            `[${this.name}] Signaling member assignment signals via Outbox for ${entries.length} users`,
        );

        const outboxEntries = entries.map(([userId, tasks]) => ({
            kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
            kafka_key: userId,
            payload: {
                type: KAFKA_EVENTS.TASK_AGGREGATED.MEMBERS_CHANGED,
                userId,
                tasks,
            },
        }));

        await db.insertInto('outbox_events').values(outboxEntries).execute();
    }
}
