import { db } from '../../../../database';
import { logger } from '../../../../logger';
import { findLinksForTaskRepair } from '../../../../modules/task/internal/TaskQueries.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import {
    appendEventsToOutbox,
    type OutboxEntry,
} from '../../../../utils/event-bus/OutboxQueries.ts';

/**
 * Publishes signaling events for Task cleanup using the Transactional Outbox.
 */
export class TaskCleanupHandler {
    name = 'TaskCleanupHandler';

    async handle(taskIds: string[]): Promise<void> {
        if (taskIds.length === 0) return;

        logger.info(
            `[${this.name}] Signaling task cleanup & repair for ${taskIds.length} tasks`,
        );

        // 1. Identify all links associated with these tasks via Domain Repository
        const links = await findLinksForTaskRepair(taskIds);

        const signals: OutboxEntry[] = links.map((link) => ({
            kafka_topic: KAFKA_TOPICS.TASK,
            kafka_key: link.fk_project_id,
            payload: {
                type: KAFKA_EVENTS.TASK_LINK.DELETED,
                linkId: link.id,
                projectId: link.fk_project_id,
                sourceTaskId: link.source_task_id,
                targetTaskId: link.target_task_id,
            },
        }));

        // Add the main TASK.DELETED signal
        signals.push({
            kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
            kafka_key: 'cleanup',
            payload: {
                type: KAFKA_EVENTS.TASK_AGGREGATED.DELETED,
                taskIds,
            },
        });

        // 2. Push all signals to Outbox
        await appendEventsToOutbox(db, signals);
    }
}
