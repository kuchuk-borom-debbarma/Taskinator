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
                [KAFKA_EVENTS.TASK_LINK.CREATED]:
                    this.handleTaskBatch.bind(this),
                [KAFKA_EVENTS.TASK_LINK.UPDATED]:
                    this.handleTaskBatch.bind(this),
                [KAFKA_EVENTS.TASK_LINK.DELETED]:
                    this.handleTaskBatch.bind(this),
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

            // [1.5] Strict Chronological Sort
            // Ensures causality (Create -> Update -> Delete) is preserved regardless of Kafka fetch order
            const chronologicallyOrderedEvents = [...unprocessed].sort(
                (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime(),
            );

            // [2] Semantic Folding & Delta Calculation
            const projectDeltas = new Map<string, number>();
            const teamDeltas = new Map<string, number>();
            const deletedTaskIds = new Set<string>();
            const linkDeltas = new Map<
                string,
                {
                    delta: number;
                    projectId: string;
                    sourceId: string;
                    targetId: string;
                }
            >();

            for (const event of chronologicallyOrderedEvents) {
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
                        deletedTaskIds.add(taskId);
                        break;

                    case KAFKA_EVENTS.TASK.UPDATED: {
                        const { old, new: newState } = data;

                        // Team Changes (Folding team task counts)
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
                        break;
                    }

                    case KAFKA_EVENTS.TASK_LINK.CREATED: {
                        const key = `${data.sourceTaskId}:${data.targetTaskId}`;
                        const existing = linkDeltas.get(key) || {
                            delta: 0,
                            projectId: data.projectId,
                            sourceId: data.sourceTaskId,
                            targetId: data.targetTaskId,
                        };
                        linkDeltas.set(key, {
                            ...existing,
                            delta: existing.delta + 1,
                        });
                        break;
                    }

                    case KAFKA_EVENTS.TASK_LINK.DELETED: {
                        const key = `${data.sourceTaskId}:${data.targetTaskId}`;
                        const existing = linkDeltas.get(key) || {
                            delta: 0,
                            projectId: data.projectId,
                            sourceId: data.sourceTaskId,
                            targetId: data.targetTaskId,
                        };
                        linkDeltas.set(key, {
                            ...existing,
                            delta: existing.delta - 1,
                        });
                        break;
                    }

                    case KAFKA_EVENTS.TASK_LINK.UPDATED: {
                        const {
                            projectId,
                            oldSourceTaskId,
                            oldTargetTaskId,
                            newSourceTaskId,
                            newTargetTaskId,
                        } = data;

                        // Remove old connection
                        const oldKey = `${oldSourceTaskId}:${oldTargetTaskId}`;
                        const oldEx = linkDeltas.get(oldKey) || {
                            delta: 0,
                            projectId,
                            sourceId: oldSourceTaskId,
                            targetId: oldTargetTaskId,
                        };
                        linkDeltas.set(oldKey, {
                            ...oldEx,
                            delta: oldEx.delta - 1,
                        });

                        // Add new connection
                        const newKey = `${newSourceTaskId}:${newTargetTaskId}`;
                        const newEx = linkDeltas.get(newKey) || {
                            delta: 0,
                            projectId,
                            sourceId: newSourceTaskId,
                            targetId: newTargetTaskId,
                        };
                        linkDeltas.set(newKey, {
                            ...newEx,
                            delta: newEx.delta + 1,
                        });
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

            // Link Reachability Syncs
            for (const sync of linkDeltas.values()) {
                if (sync.delta === 0) continue;

                // Optimization: If either task is being deleted, the bulk signal handles it
                if (
                    deletedTaskIds.has(sync.sourceId) ||
                    deletedTaskIds.has(sync.targetId)
                ) {
                    continue;
                }

                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.TASK_AGGREGATED
                            .SYNC_TASK_REACHABILITY,
                        projectId: sync.projectId,
                        sourceTaskId: sync.sourceId,
                        targetTaskId: sync.targetId,
                        action: sync.delta > 0 ? 'ADD' : 'REMOVE',
                    },
                });
            }

            // Bulk Cleanup Actions (Triggered on task deletion)
            if (deletedTaskIds.size > 0) {
                const ids = Array.from(deletedTaskIds);

                // Signal Task Module to purge direct links
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.TASK_AGGREGATED.DELETE_TASK_LINKS,
                        taskIds: ids,
                    },
                });

                // Signal Task Module to repair reachability paths
                // This is a separate, heavy operation that must be handled by the listener
                outboxEntries.push({
                    kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                    payload: {
                        type: KAFKA_EVENTS.TASK_AGGREGATED
                            .DELETE_TASK_REACHABILITY,
                        taskIds: ids,
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
