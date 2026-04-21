import eventBus from '../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../utils/event-bus/types.ts';
import { logger } from '../../../logger';
import {
    TaskDirectLinkCountHandler,
    type TaskDirectLinkDelta,
} from './handlers/TaskDirectLinkCountHandler.ts';
import { ReachabilityExpansionHandler } from './handlers/ReachabilityExpansionHandler.ts';

interface Edge {
    s: string;
    t: string;
}

/**
 * Aggregates task link events into net edge changes.
 * Handles Created, Updated, and Deleted events with semantic folding and project isolation.
 *
 * Logic: Calculates net deltas for direct incoming/outgoing counts per node.
 */
export class TaskLinkEvents_BatchAggregator {
    private directCountHandler = new TaskDirectLinkCountHandler();
    private reachabilityExpansionHandler = new ReachabilityExpansionHandler();

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
            { batch: true },
        );
    }

    private async handleBatch(events: DomainEvent[]) {
        if (events.length === 0) return;

        // Group by projectId first to ensure updates are isolated
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

            if (!projectChanges.has(projectId)) {
                projectChanges.set(projectId, new Map());
            }

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

        // Process each project's net changes
        for (const [projectId, linkLifecycle] of projectChanges.entries()) {
            const taskDeltas = new Map<string, { in: number; out: number }>();

            const getDelta = (taskId: string) => {
                if (!taskDeltas.has(taskId)) {
                    taskDeltas.set(taskId, { in: 0, out: 0 });
                }
                return taskDeltas.get(taskId)!;
            };

            for (const state of linkLifecycle.values()) {
                const { initial, final, existedBefore, existsAfter } = state;

                // Edge Additions
                if (!existedBefore && existsAfter && final) {
                    getDelta(final.s).out++;
                    getDelta(final.t).in++;
                }
                // Edge Removals
                else if (existedBefore && !existsAfter && initial) {
                    getDelta(initial.s).out--;
                    getDelta(initial.t).in--;
                }
                // Edge Updates (Endpoints changed)
                else if (existedBefore && existsAfter && initial && final) {
                    if (initial.s !== final.s || initial.t !== final.t) {
                        getDelta(initial.s).out--;
                        getDelta(initial.t).in--;

                        getDelta(final.s).out++;
                        getDelta(final.t).in++;
                    }
                }
            }

            // Map net deltas to signaling payload
            const deltaList: TaskDirectLinkDelta[] = Array.from(
                taskDeltas.entries(),
            )
                .map(([taskId, counts]) => ({
                    taskId,
                    incomingDelta: counts.in,
                    outgoingDelta: counts.out,
                }))
                .filter((d) => d.incomingDelta !== 0 || d.outgoingDelta !== 0);

            // --- REACHABILITY TRIGGER ---
            const addedEdges = Array.from(linkLifecycle.values())
                .filter((s) => !s.existedBefore && s.existsAfter && s.final)
                .map((s) => s.final!);

            const removedEdges = Array.from(linkLifecycle.values())
                .filter((s) => s.existedBefore && !s.existsAfter && s.initial)
                .map((s) => s.initial!);

            // Handle updates where endpoints changed ( Removal + Addition )
            Array.from(linkLifecycle.values())
                .filter(
                    (s) =>
                        s.existedBefore &&
                        s.existsAfter &&
                        s.initial &&
                        s.final &&
                        (s.initial.s !== s.final.s ||
                            s.initial.t !== s.final.t),
                )
                .forEach((s) => {
                    addedEdges.push(s.final!);
                    removedEdges.push(s.initial!);
                });

            if (addedEdges.length > 0 || removedEdges.length > 0) {
                await this.reachabilityExpansionHandler.triggerInitialExpansion(
                    projectId,
                    addedEdges,
                    removedEdges,
                );
            }

            if (deltaList.length > 0) {
                logger.info(
                    `[Task Link Aggregator] Project ${projectId}: Signaling direct count updates for ${deltaList.length} tasks`,
                );

                await this.directCountHandler.handleDirectLinkCountChanges(
                    projectId,
                    deltaList,
                );
            }
        }
    }
}
