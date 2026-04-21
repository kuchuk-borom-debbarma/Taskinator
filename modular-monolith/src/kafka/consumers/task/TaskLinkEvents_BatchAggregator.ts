import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';

interface Edge {
    s: string;
    t: string;
}

/**
 * Aggregates task link events into net edge changes.
 * Handles Created, Updated, and Deleted events with semantic folding and project isolation.
 *
 * Future: Will trigger Link Metrics and Reachability handlers.
 */
export class TaskLinkEvents_BatchAggregator {
    async init() {
        logger.info('[Task Module] Initializing Task Link Batch Aggregator');

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK,
            'task-link-aggregator-group',
            {
                [KAFKA_EVENTS.TASK_LINK.CREATED]: () => {}, // Handled in batch
                [KAFKA_EVENTS.TASK_LINK.UPDATED]: () => {},
                [KAFKA_EVENTS.TASK_LINK.DELETED]: () => {},
            },
            {
                batch: true,
                eachBatch: this.handleBatch.bind(this),
            },
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
            const addedEdges: Edge[] = [];
            const removedEdges: Edge[] = [];

            for (const state of linkLifecycle.values()) {
                const { initial, final, existedBefore, existsAfter } = state;

                // Edge Additions
                if (!existedBefore && existsAfter && final) {
                    addedEdges.push(final);
                }
                // Edge Removals
                else if (existedBefore && !existsAfter && initial) {
                    removedEdges.push(initial);
                }
                // Edge Updates (Folded into Remove/Add if endpoints changed)
                else if (existedBefore && existsAfter && initial && final) {
                    if (initial.s !== final.s || initial.t !== final.t) {
                        removedEdges.push(initial);
                        addedEdges.push(final);
                    }
                }
            }

            if (addedEdges.length > 0 || removedEdges.length > 0) {
                logger.info(
                    `[Task Link Aggregator] Project ${projectId}: Folded ${addedEdges.length} additions and ${removedEdges.length} removals. (Handlers not yet implemented)`,
                );

                // TODO: Emit LINK_COUNTS_CHANGED and REACHABILITY_CHANGED signals here.
            }
        }
    }
}
