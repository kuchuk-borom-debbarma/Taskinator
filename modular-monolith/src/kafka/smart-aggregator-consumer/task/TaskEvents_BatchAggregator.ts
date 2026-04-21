import { db } from '../../../database';
import { logger } from '../../../logger';
import eventBus from '../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../utils/event-bus/idempotency.ts';
import {
    appendEventsToOutbox,
    type OutboxEntry,
} from '../../../utils/event-bus/OutboxQueries.ts';
import type { DomainEvent } from '../../../utils/event-bus/types.ts';

/**
 * Task Smart Batch Aggregator
 *
 * Responsibilities:
 * 1. Fold raw Task events (Create/Update/Delete) to minimize downstream churn.
 * 2. Calculate deltas for Projects, Teams, and Members.
 * 3. Emit declarative cleanup and sync actions into TASK_AGGREGATED topic.
 * 4. Atomic processing via Transactional Outbox.
 */
export class TaskEvents_BatchAggregator {
    async init() {
        logger.info('[TaskEvents -> Aggregator] Initializing Smart Consumer');

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK,
            'task-aggregator-group',
            {
                [KAFKA_EVENTS.TASK.CREATED]: this.handleTaskBatch.bind(this),
                [KAFKA_EVENTS.TASK.UPDATED]: this.handleTaskBatch.bind(this),
                [KAFKA_EVENTS.TASK.DELETED]: this.handleTaskBatch.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTaskBatch(events: DomainEvent[]) {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-aggregator-group',
            );

            if (unprocessed.length === 0) {
                logger.info(
                    '[Task Coordinator] Batch already processed, skipping',
                );
                return;
            }

            logger.info(
                `[Task Coordinator] Processing batch of ${unprocessed.length} new events`,
            );

            // [2] Semantic Folding & Delta Calculation
            const projectDeltas = new Map<string, number>();
            const teamDeltas = new Map<string, number>();
            const memberDeltas = new Map<string, number>();
            const deletedTaskIds: string[] = [];

            for (const event of unprocessed) {
                const data = event.data;
                const { projectId, taskId } = data;

                switch (event.type) {
                    case KAFKA_EVENTS.TASK.CREATED:
                        projectDeltas.set(
                            projectId,
                            (projectDeltas.get(projectId) || 0) + 1,
                        );
                        if (data.teamId) {
                            teamDeltas.set(
                                data.teamId,
                                (teamDeltas.get(data.teamId) || 0) + 1,
                            );
                        }
                        if (data.memberId) {
                            memberDeltas.set(
                                data.memberId,
                                (memberDeltas.get(data.memberId) || 0) + 1,
                            );
                        }
                        break;

                    case KAFKA_EVENTS.TASK.DELETED:
                        projectDeltas.set(
                            projectId,
                            (projectDeltas.get(projectId) || 0) - 1,
                        );
                        if (data.teamId) {
                            teamDeltas.set(
                                data.teamId,
                                (teamDeltas.get(data.teamId) || 0) - 1,
                            );
                        }
                        if (data.memberId) {
                            memberDeltas.set(
                                data.memberId,
                                (memberDeltas.get(data.memberId) || 0) - 1,
                            );
                        }
                        deletedTaskIds.push(taskId);
                        break;

                    case KAFKA_EVENTS.TASK.UPDATED: {
                        const { old, new: newState } = data;

                        // Team Changes
                        if (old.teamId !== newState.teamId) {
                            if (old.teamId)
                                teamDeltas.set(
                                    old.teamId,
                                    (teamDeltas.get(old.teamId) || 0) - 1,
                                );
                            if (newState.teamId)
                                teamDeltas.set(
                                    newState.teamId,
                                    (teamDeltas.get(newState.teamId) || 0) + 1,
                                );
                        }

                        // Member Changes (Assignment Delta)
                        if (old.memberId !== newState.memberId) {
                            if (old.memberId)
                                memberDeltas.set(
                                    old.memberId,
                                    (memberDeltas.get(old.memberId) || 0) - 1,
                                );
                            if (newState.memberId)
                                memberDeltas.set(
                                    newState.memberId,
                                    (memberDeltas.get(newState.memberId) || 0) +
                                        1,
                                );
                        }
                        break;
                    }
                }
            }

            // [3] Build Outbox Signals
            const outboxEntries: OutboxEntry[] = [];

            // Project Count Syncs
            for (const [projectId, delta] of projectDeltas.entries()) {
                if (delta === 0) continue;
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.TASK_AGGREGATED
                            .SYNC_PROJECT_TASK_COUNT,
                        projectId,
                        delta,
                    },
                });
            }

            // Team Count Syncs
            for (const [teamId, delta] of teamDeltas.entries()) {
                if (delta === 0) continue;
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.TASK_AGGREGATED.SYNC_TEAM_TASK_COUNT,
                        teamId,
                        delta,
                    },
                });
            }

            // Member Assignment Updates
            for (const [userId, delta] of memberDeltas.entries()) {
                if (delta === 0) continue;
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.TASK_AGGREGATED
                            .UPDATE_MEMBER_ASSIGNED_TASK_COUNT,
                        userId,
                        delta,
                    },
                });
            }

            // Bulk Cleanup Actions
            if (deletedTaskIds.length > 0) {
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.TASK_AGGREGATED.DELETE_TASK_LINKS,
                        taskIds: deletedTaskIds,
                    },
                });
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.TASK_AGGREGATED.PURGE_TASK_COMMENTS,
                        taskIds: deletedTaskIds,
                    },
                });
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.TASK_AGGREGATED
                            .PURGE_TASK_ATTACHMENTS,
                        taskIds: deletedTaskIds,
                    },
                });
            }

            // [4] Atomic Sink
            if (outboxEntries.length > 0) {
                await appendEventsToOutbox(trx, outboxEntries);
                logger.info(
                    `[Task Coordinator] Wrote ${outboxEntries.length} signals for batch`,
                );
            }
        });
    }
}
