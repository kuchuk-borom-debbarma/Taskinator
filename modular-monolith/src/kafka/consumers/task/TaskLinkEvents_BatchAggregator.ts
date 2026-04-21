import { db } from '../../../database';
import eventBus from '../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../utils/event-bus/types.ts';
import { logger } from '../../../logger';
import {
    type ReachabilityExpansionStep,
    type TaskDirectLinkDelta,
} from '../../../modules/task/internal/ReachabilityQueries.ts';
import { claimEventsAtomic } from '../../../utils/event-bus/idempotency.ts';

interface Edge {
    s: string;
    t: string;
}

/**
 * Aggregates task link events into net edge changes.
 * Handles Created, Updated, and Deleted events with semantic folding and project isolation.
 *
 * Logic: Calculates net deltas for direct incoming/outgoing counts per node.
 * Signals results via the Transactional Outbox for 100% resilience.
 */
export class TaskLinkEvents_BatchAggregator {
    async init() {
        logger.info('[Task Module] Initializing Task Link Batch Aggregator');

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK,
            'task-link-aggregator-group',
            {
                [KAFKA_EVENTS.TASK_LINK.CREATED]: this.handleBatch.bind(this),
                [KAFKA_EVENTS.TASK_LINK.UPDATED]: this.handleBatch.bind(this),
                [KAFKA_EVENTS.TASK_LINK.DELETED]: this.handleBatch.bind(this),
            },
            { batch: true, manualIdempotency: true },
        );
    }

    private async handleBatch(events: DomainEvent[]) {
        if (events.length === 0) return;

        // 1. Group Events by Project and Link lifecycle
        const projectChanges = new Map<
            string,
            Map<
                string,
                {
                    initial?: Edge;
                    final?: Edge;
                    existedBefore: boolean;
                    existsAfter: boolean;
                }
            >
        >();

        for (const event of events) {
            const { linkId, projectId } = event.data;
            if (!projectChanges.has(projectId))
                projectChanges.set(projectId, new Map());

            const linkLifecycle = projectChanges.get(projectId)!;
            let entry = linkLifecycle.get(linkId);

            if (!entry) {
                entry = { existedBefore: false, existsAfter: false };
                linkLifecycle.set(linkId, entry);
            }

            switch (event.type) {
                case KAFKA_EVENTS.TASK_LINK.CREATED:
                    entry.existsAfter = true;
                    entry.final = {
                        s: event.data.sourceTaskId,
                        t: event.data.targetTaskId,
                    };
                    break;

                case KAFKA_EVENTS.TASK_LINK.UPDATED:
                    if (!entry.initial && !entry.existedBefore) {
                        entry.existedBefore = true;
                        entry.initial = {
                            s: event.data.oldSourceTaskId,
                            t: event.data.oldTargetTaskId,
                        };
                    }
                    entry.existsAfter = true;
                    entry.final = {
                        s: event.data.newSourceTaskId,
                        t: event.data.newTargetTaskId,
                    };
                    break;

                case KAFKA_EVENTS.TASK_LINK.DELETED:
                    if (!entry.initial && !entry.existedBefore) {
                        entry.existedBefore = true;
                        entry.initial = {
                            s: event.data.sourceTaskId,
                            t: event.data.targetTaskId,
                        };
                    }
                    entry.existsAfter = false;
                    entry.final = undefined;
                    break;
            }
        }

        // 2. Process each project's net changes in a SINGLE pass
        for (const [projectId, linkLifecycle] of projectChanges.entries()) {
            const taskDeltas = new Map<string, { in: number; out: number }>();
            const reachabilitySteps: ReachabilityExpansionStep[] = [];

            const applyDelta = (
                taskId: string,
                direction: 'in' | 'out',
                delta: number,
            ) => {
                if (!taskDeltas.has(taskId))
                    taskDeltas.set(taskId, { in: 0, out: 0 });
                taskDeltas.get(taskId)![direction] += delta;
            };

            const addReachabilityStep = (
                edge: Edge,
                action: 'ADD' | 'REMOVE',
            ) => {
                reachabilitySteps.push({
                    projectId,
                    ancestorId: edge.s,
                    frontierId: edge.t,
                    action,
                    depth: 1,
                });
            };

            for (const state of linkLifecycle.values()) {
                const { initial, final, existedBefore, existsAfter } = state;

                // Case: Pure Addition
                if (!existedBefore && existsAfter && final) {
                    applyDelta(final.s, 'out', 1);
                    applyDelta(final.t, 'in', 1);
                    addReachabilityStep(final, 'ADD');
                }
                // Case: Pure Removal
                else if (existedBefore && !existsAfter && initial) {
                    applyDelta(initial.s, 'out', -1);
                    applyDelta(initial.t, 'in', -1);
                    addReachabilityStep(initial, 'REMOVE');
                }
                // Case: Update (Endpoints changed)
                else if (existedBefore && existsAfter && initial && final) {
                    if (initial.s !== final.s || initial.t !== final.t) {
                        // Remove old
                        applyDelta(initial.s, 'out', -1);
                        applyDelta(initial.t, 'in', -1);
                        addReachabilityStep(initial, 'REMOVE');
                        // Add new
                        applyDelta(final.s, 'out', 1);
                        applyDelta(final.t, 'in', 1);
                        addReachabilityStep(final, 'ADD');
                    }
                }
            }

            // 3. Atomicaly Signal results via Transactional Outbox
            await db.transaction().execute(async (trx) => {
                // [NEW] ATOMIC CLAIM: Deduplicate events at the database level.
                // This ensures that if the server crashes before this transaction commits,
                // the events are NOT marked as processed.
                const projectEvents = events.filter(
                    (e) => e.data.projectId === projectId,
                );
                const approvedEvents = await claimEventsAtomic(
                    trx,
                    projectEvents,
                    'task-link-aggregator-group',
                );

                if (approvedEvents.length === 0) {
                    logger.info(
                        `[Task Link Aggregator] Project ${projectId}: Skipping redundant/retried batch`,
                    );
                    return;
                }

                const outboxEntries = [];

                // Direct Link Count Signal
                const deltaList = Array.from(taskDeltas.entries())
                    .map(([taskId, counts]) => ({
                        taskId,
                        incomingDelta: counts.in,
                        outgoingDelta: counts.out,
                    }))
                    .filter(
                        (d) => d.incomingDelta !== 0 || d.outgoingDelta !== 0,
                    );

                if (deltaList.length > 0) {
                    outboxEntries.push({
                        kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                        kafka_key: projectId,
                        payload: {
                            type: KAFKA_EVENTS.TASK_AGGREGATED
                                .DIRECT_LINK_COUNTS_CHANGED,
                            projectId,
                            deltas: deltaList,
                        },
                    });
                }

                // Reachability Expansion Signal
                if (reachabilitySteps.length > 0) {
                    outboxEntries.push({
                        kafka_topic: KAFKA_TOPICS.TASK_AGGREGATED,
                        kafka_key: projectId,
                        payload: {
                            type: KAFKA_EVENTS.TASK_AGGREGATED
                                .REACHABILITY_EXPAND,
                            steps: reachabilitySteps,
                        },
                    });
                }

                if (outboxEntries.length > 0) {
                    logger.info(
                        `[Task Link Aggregator] Project ${projectId}: Atomically signaling ${outboxEntries.length} outbox events`,
                    );
                    await trx
                        .insertInto('outbox_events')
                        .values(outboxEntries)
                        .execute();
                }
            });
        }
    }
}
