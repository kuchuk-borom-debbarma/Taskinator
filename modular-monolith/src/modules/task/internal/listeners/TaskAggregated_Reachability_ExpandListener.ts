import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { db } from '../../../../database';
import {
    expandReachabilityFrontierBatch,
    type ReachabilityExpansionStep,
} from '../ReachabilityQueries.ts';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';

/**
 * High-Resilience Recursive Worker for Task Reachability.
 *
 * This listener is now stateless and extremely lightweight.
 * It consolidation Kafka batches and triggers the atomic DB transaction.
 *
 * Logic Flow:
 * 1. Batch Consolidation.
 * 2. Atomic DB Expansion + Cleanup + Sync + Outbox Signal.
 * 3. DONE (Next step is triggered via the DB outbox).
 */
export class TaskAggregated_Reachability_ExpandListener {
    async init() {
        logger.info(
            '[Reachability Engine] Initializing Atomic Expansion Worker',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'reachability-expansion-group',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.REACHABILITY_EXPAND]:
                    this.handleExpansion.bind(this),
            },
            { batch: true, manualIdempotency: true },
        );
    }

    private async handleExpansion(
        events: DomainEvent<{ steps: ReachabilityExpansionStep[] }>[],
    ) {
        if (events.length === 0) return;

        try {
            await db.transaction().execute(async (trx) => {
                // ATOMIC CLAIM: Deduplicate events at the database level inside the transaction
                const approvedEvents = await claimEventsAtomic(
                    trx,
                    events,
                    'reachability-expansion-group',
                );

                if (approvedEvents.length === 0) {
                    logger.info(
                        '[Reachability Engine] Skipping redundant/retried batch',
                    );
                    return;
                }

                const approvedSteps = approvedEvents.flatMap(
                    (e) => e.data.steps,
                );

                logger.info(
                    `[Reachability Engine] Executing atomic expansion batch for ${approvedSteps.length} paths`,
                );

                // ONE SINGLE AWAIT: The DB handles state, cleanup, sync, and the next-step signal.
                await expandReachabilityFrontierBatch(approvedSteps, trx);
            });
        } catch (error) {
            logger.error(
                '[Reachability Engine] Atomic expansion failed:',
                error,
            );
            // Throwing allows Kafka to retry the batch.
            // Because the DB operation is atomic, there is no risk of partial state on retry.
            throw error;
        }
    }
}
