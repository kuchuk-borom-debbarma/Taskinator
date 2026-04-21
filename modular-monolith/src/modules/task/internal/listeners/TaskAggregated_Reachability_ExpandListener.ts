import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import {
    expandReachabilityFrontierBatch,
    cleanupOrphanedReachability,
    syncTaskTransitiveCounts,
    type ReachabilityExpansionStep,
} from '../ReachabilityQueries.ts';

const MAX_RECURSION_DEPTH = 100;

/**
 * Recursive Worker for Task Reachability Expansion.
 * Implements the "Frontier Expansion" algorithm using Kafka re-publishing.
 */
export class TaskAggregated_Reachability_ExpandListener {
    async init() {
        logger.info(
            '[Reachability Engine] Initializing Recursive Expansion Worker',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'reachability-expansion-group',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.REACHABILITY_EXPAND]:
                    this.handleExpansion.bind(this),
            },
            { batch: true },
        );
    }

    private async handleExpansion(
        events: DomainEvent<{ steps: ReachabilityExpansionStep[] }>[],
    ) {
        if (events.length === 0) return;

        // 1. Consolidate ALL steps from the batch (Declarative)
        const allSteps = events.flatMap((e) => e.data.steps);

        logger.debug(
            `[Reachability Engine] Processing expansion batch of ${allSteps.length} paths`,
        );

        try {
            // 2. Execute the Expansion Matrix Update (One atomic DB call)
            const nextSteps = await expandReachabilityFrontierBatch(allSteps);

            // 3. Cleanup and Sync
            if (allSteps.some((s) => s.action === 'REMOVE')) {
                await cleanupOrphanedReachability();
            }

            // Sync total transitive counts for affected tasks (Declarative collection)
            const affectedTasks = new Set(
                allSteps.flatMap((s) => [s.ancestorId, s.frontierId]),
            );
            await syncTaskTransitiveCounts(Array.from(affectedTasks));

            // 4. Recursive Republication
            if (nextSteps.length > 0) {
                const validNextSteps = nextSteps.filter(
                    (s) => s.depth <= MAX_RECURSION_DEPTH,
                );

                if (validNextSteps.length < nextSteps.length) {
                    logger.warn(
                        `[Reachability Engine] Terminated ${
                            nextSteps.length - validNextSteps.length
                        } paths due to depth limit`,
                    );
                }

                if (validNextSteps.length > 0) {
                    logger.info(
                        `[Reachability Engine] Republishing ${validNextSteps.length} expansion steps`,
                    );

                    await eventBus.publish(
                        KAFKA_TOPICS.TASK_AGGREGATED,
                        KAFKA_EVENTS.TASK_AGGREGATED.REACHABILITY_EXPAND,
                        {
                            key: validNextSteps[0]!.projectId,
                            data: { steps: validNextSteps },
                        },
                    );
                }
            }
        } catch (error) {
            logger.error(
                '[Reachability Engine] Critical failure during expansion step:',
                error,
            );
            throw error;
        }
    }
}
