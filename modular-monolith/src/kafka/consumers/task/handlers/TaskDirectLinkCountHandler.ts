import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import { logger } from '../../../../logger';

export interface TaskDirectLinkDelta {
    taskId: string;
    incomingDelta: number;
    outgoingDelta: number;
}

/**
 * Task Direct Link Count Signaling Handler.
 * Emits signals for direct incoming/outgoing link count updates.
 */
export class TaskDirectLinkCountHandler {
    /**
     * Entry point for direct link count signals.
     * Dispatches net deltas per task to the event bus.
     */
    async handleDirectLinkCountChanges(
        projectId: string,
        deltas: TaskDirectLinkDelta[],
    ) {
        if (deltas.length === 0) return;

        logger.info(
            `[Direct Link Count Handler] Project ${projectId}: Signaling count updates for ${deltas.length} tasks`,
        );

        await eventBus.publish(
            KAFKA_TOPICS.TASK_AGGREGATED,
            KAFKA_EVENTS.TASK_AGGREGATED.DIRECT_LINK_COUNTS_CHANGED,
            { key: projectId, data: { projectId, deltas } },
        );
    }
}
