import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { updateTaskDirectLinkCountsBatch } from '../TaskQueries.ts';
import type { TaskDirectLinkDelta } from '../ReachabilityQueries.ts';

/**
 * Execution Listener for Direct Task Link Counts.
 * Synchronizes the direct incoming and outgoing link counters on task nodes.
 * Optimized for single-transaction batch updates.
 */
export class TaskAggregated_DirectLinkCountsChanged_SyncTaskCountsListener {
    async init() {
        logger.info(
            '[Task Module] Monitoring TASK_AGGREGATED.DIRECT_LINK_COUNTS_CHANGED for singleton batch sync',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'task-direct-link-metrics-sync',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.DIRECT_LINK_COUNTS_CHANGED]:
                    this.handleDirectLinkCountsChanged.bind(this),
            },
            { batch: true },
        );
    }

    /**
     * Consolidates all events in the batch into a single database operation.
     */
    private async handleDirectLinkCountsChanged(
        events: DomainEvent<{
            projectId: string;
            deltas: TaskDirectLinkDelta[];
        }>[],
    ) {
        if (events.length === 0) return;

        // Map key: taskId, value: { projectId, inc, out }
        const consolidatedDeltasMap = new Map<
            string,
            { projectId: string; inc: number; out: number }
        >();

        // 1. Consolidate ALL deltas from ALL events in the batch
        for (const event of events) {
            const { projectId, deltas } = event.data;
            for (const delta of deltas) {
                const existing = consolidatedDeltasMap.get(delta.taskId) || {
                    projectId,
                    inc: 0,
                    out: 0,
                };

                existing.inc += delta.incomingDelta;
                existing.out += delta.outgoingDelta;

                consolidatedDeltasMap.set(delta.taskId, existing);
            }
        }

        const consolidatedList = Array.from(
            consolidatedDeltasMap.entries(),
        ).map(([taskId, data]) => ({
            taskId,
            projectId: data.projectId,
            incomingDelta: data.inc,
            outgoingDelta: data.out,
        }));

        if (consolidatedList.length === 0) return;

        try {
            logger.info(
                `[Direct Task Metrics] Single-Operation Sync: Updating ${consolidatedList.length} tasks across the entire batch`,
            );

            // 2. Perform ONE database call for the entire batch
            await updateTaskDirectLinkCountsBatch(consolidatedList);
        } catch (error) {
            logger.error(
                `[Direct Task Metrics] Failed to perform singleton batch sync:`,
                error,
            );
            throw error;
        }
    }
}
