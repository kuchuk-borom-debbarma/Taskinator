/**
 * @file PipelineEventListener.ts
 * @description Kafka event listener for Autopilot pipeline orchestration.
 * Handles PIPELINE.TRIGGER and PIPELINE.CONTINUE events to enable resumable execution.
 *
 * @mandate PIPE-01, PIPE-02
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database/index.js';
import { logger } from '../../../logger/index.js';
import eventBus from '../../../utils/EventBus.ts';
import { claimEventsAtomic } from '../../../utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../utils/event-bus/index.js';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../utils/event-bus/index.js';
import { appendEventsToOutbox } from '../../../utils/event-bus/OutboxQueries.ts';
import type { PipelineOrchestrator } from './PipelineOrchestrator.ts';
import type { SmartAggregator } from './SmartAggregator.ts';
import type { ExecutionState } from './types.js';

export class PipelineEventListener {
    constructor(
        private readonly orchestrator: PipelineOrchestrator,
        private readonly aggregator: SmartAggregator,
    ) {}

    /**
     * Initializes the listener and subscribes to the Autopilot topic.
     */
    async init() {
        logger.info(
            '[PipelineEventListener] Initializing for Autopilot topic...',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.AUTOPILOT,
            'pipeline-orchestrator-group',
            {
                [KAFKA_EVENTS.PIPELINE.TRIGGER]: this.onTrigger.bind(this),
                [KAFKA_EVENTS.PIPELINE.CONTINUE]: this.onContinue.bind(this),
            },
            { batch: true },
        );
    }

    /**
     * Handles initial pipeline triggers.
     * Generates a new traceId and starts at step 0.
     */
    private async onTrigger(events: DomainEvent<any>[]) {
        if (events.length === 0) return;

        logger.info(
            `[PipelineEventListener] [onTrigger] Received batch of ${events.length} trigger events`,
        );

        let unprocessed: DomainEvent<any>[] = [];
        await db.transaction().execute(async (trx) => {
            unprocessed = await claimEventsAtomic(
                trx,
                events,
                'pipeline-orchestrator-group',
            );
        });

        logger.info(
            `[PipelineEventListener] [onTrigger] Filtered unprocessed triggers: ${unprocessed.length}/${events.length}`,
        );

        for (const event of unprocessed) {
            const payload = event.data?.data ?? event.data;
            const {
                autopilotId,
                entityType,
                entityId,
                snapshot,
                isRecursiveTrigger,
                depth: parentDepth,
            } = payload;

            // Task 3: Increment depth only on recursive triggers
            let depth = parentDepth || 0;
            if (isRecursiveTrigger) {
                depth += 1;
            }

            const state: ExecutionState = {
                traceId: uuidv4(),
                entityType,
                entityId,
                depth,
                stepIndex: 0,
                wasSnapshot: !!snapshot,
                snapshot,
            };

            logger.info(
                `[PipelineEventListener] [onTrigger] Spawning traceId=${state.traceId} for autopilotId=${autopilotId}, entityType=${entityType}, entityId=${entityId}, depth=${state.depth}`,
            );
            await this.processStep(autopilotId, state, db);
        }
    }

    /**
     * Handles pipeline continuation events.
     * Resumes execution from the provided state.
     */
    private async onContinue(events: DomainEvent<any>[]) {
        if (events.length === 0) return;

        logger.info(
            `[PipelineEventListener] [onContinue] Received batch of ${events.length} continue events`,
        );

        let unprocessed: DomainEvent<any>[] = [];
        await db.transaction().execute(async (trx) => {
            unprocessed = await claimEventsAtomic(
                trx,
                events,
                'pipeline-orchestrator-group',
            );
        });

        logger.info(
            `[PipelineEventListener] [onContinue] Filtered unprocessed continue events: ${unprocessed.length}/${events.length}`,
        );

        for (const event of unprocessed) {
            const payload = event.data?.data ?? event.data;
            const { autopilotId, state } = payload;
            logger.info(
                `[PipelineEventListener] [onContinue] Resuming traceId=${state.traceId} at stepIndex=${state.stepIndex} for autopilotId=${autopilotId}`,
            );
            await this.processStep(autopilotId, state, db);
        }
    }

    /**
     * Executes a single step and schedules the next one if applicable.
     */
    private async processStep(
        autopilotId: string,
        state: ExecutionState,
        queryClient: any = db,
    ) {
        logger.info(
            `[PipelineEventListener] Executing step ${state.stepIndex} for autopilot ${autopilotId} (traceId: ${state.traceId})`,
        );

        try {
            const result = await this.orchestrator.executeStep(
                autopilotId,
                state,
            );

            if (result.status === 'SUCCESS') {
                // Task 3: Push mutations to SmartAggregator
                if (
                    result.mutatedEntities &&
                    result.mutatedEntities.length > 0
                ) {
                    logger.info(
                        `[PipelineEventListener] Step succeeded: Mutated ${result.mutatedEntities.length} entities. Pushing to SmartAggregator.`,
                    );
                    for (const entity of result.mutatedEntities) {
                        logger.debug(
                            `[PipelineEventListener] Push changes for ${entity.type}:${entity.id}: ${JSON.stringify(entity.getChanges())}`,
                        );
                        this.aggregator.push(
                            entity.type,
                            entity.id,
                            entity.getChanges(),
                            state.traceId,
                            state.depth,
                        );
                    }
                }

                if (result.nextIndex !== undefined) {
                    // Emit continuation event to outbox
                    logger.info(
                        `[PipelineEventListener] Scheduling next stepIndex=${result.nextIndex} for autopilotId=${autopilotId} (traceId: ${state.traceId})`,
                    );
                    await appendEventsToOutbox(queryClient, [
                        {
                            kafka_topic: KAFKA_TOPICS.AUTOPILOT,
                            payload: {
                                type: KAFKA_EVENTS.PIPELINE.CONTINUE,
                                data: {
                                    autopilotId,
                                    state: {
                                        ...state,
                                        stepIndex: result.nextIndex,
                                    },
                                },
                            },
                        },
                    ]);
                } else {
                    logger.info(
                        `[PipelineEventListener] Final step completed. Flushing all buffered aggregations for traceId: ${state.traceId}`,
                    );
                    await this.aggregator.flushAll();
                    logger.info(
                        `[PipelineEventListener] Pipeline completed successfully for autopilot ${autopilotId} (traceId: ${state.traceId})`,
                    );
                }
            } else if (result.status === 'HALTED') {
                logger.info(
                    `[PipelineEventListener] Pipeline halted for autopilot ${autopilotId} (traceId: ${state.traceId}): ${result.reason}`,
                );
            } else {
                logger.error(
                    `[PipelineEventListener] Pipeline error for autopilot ${autopilotId} (traceId: ${state.traceId}): ${result.reason}`,
                );
            }
        } catch (error: any) {
            logger.error(
                `[PipelineEventListener] Critical error in pipeline ${autopilotId} (traceId: ${state.traceId}): ${error.message}`,
                { stack: error.stack },
            );
        }
    }
}
