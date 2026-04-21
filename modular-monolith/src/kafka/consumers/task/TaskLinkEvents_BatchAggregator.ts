import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { ReachabilityHandler } from './handlers/ReachabilityHandler.ts';

interface LinkState {
    sourceId: string;
    targetId: string;
    exists: boolean;
}

/**
 * Aggregates task link events into net edge changes.
 * Handles Created, Updated, and Deleted events with semantic folding.
 */
export class TaskLinkEvents_BatchAggregator {
    private reachabilityHandler = new ReachabilityHandler();

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

        // linkId -> { initialEdge, finalEdge, existedBefore, existsAfter }
        const linkLifecycle = new Map<
            string,
            {
                initial?: { s: string; t: string };
                final?: { s: string; t: string };
                existedBefore: boolean;
                existsAfter: boolean;
            }
        >();

        for (const event of events) {
            const { linkId } = event.data;
            let entry = linkLifecycle.get(linkId);

            if (!entry) {
                entry = { existedBefore: false, existsAfter: false };
                linkLifecycle.set(linkId, entry);
            }

            switch (event.type) {
                case KAFKA_EVENTS.TASK_LINK.CREATED:
                    if (!entry.initial && !entry.existedBefore) {
                        // First time seeing it in batch, and it's a create
                        entry.existedBefore = false;
                    }
                    entry.existsAfter = true;
                    entry.final = {
                        s: event.data.sourceTaskId,
                        t: event.data.targetTaskId,
                    };
                    break;

                case KAFKA_EVENTS.TASK_LINK.UPDATED:
                    if (!entry.initial && !entry.existedBefore) {
                        // First time seeing it, it's an update -> MUST have existed before
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
                        // First time seeing it, it's a delete -> MUST have existed before
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

        const addedEdges: { s: string; t: string }[] = [];
        const removedEdges: { s: string; t: string }[] = [];

        for (const [linkId, state] of linkLifecycle.entries()) {
            const { initial, final, existedBefore, existsAfter } = state;

            // Scenario 1: Pure Addition
            if (!existedBefore && existsAfter && final) {
                addedEdges.push(final);
                continue;
            }

            // Scenario 2: Pure Removal
            if (existedBefore && !existsAfter && initial) {
                removedEdges.push(initial);
                continue;
            }

            // Scenario 3: Update (Remove old, Add new)
            if (existedBefore && existsAfter && initial && final) {
                if (initial.s !== final.s || initial.t !== final.t) {
                    removedEdges.push(initial);
                    addedEdges.push(final);
                }
                continue;
            }

            // Scenario 0: Create then Delete in same batch -> Nop
        }

        if (addedEdges.length > 0 || removedEdges.length > 0) {
            logger.info(
                `[Task Link Aggregator] Processing ${addedEdges.length} additions and ${removedEdges.length} removals`,
            );

            try {
                await this.reachabilityHandler.handleEdgeChanges({
                    added: addedEdges,
                    removed: removedEdges,
                });
            } catch (error) {
                logger.error(
                    '[Task Link Aggregator] Reachability update failed:',
                    error,
                );
                throw error;
            }
        }
    }
}
