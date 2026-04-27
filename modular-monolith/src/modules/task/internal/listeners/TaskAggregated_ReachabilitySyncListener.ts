import { db } from '../../../../database';
import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import {
    contractTaskReachability,
    expandTaskReachability,
    syncTaskGraphCounters,
} from '../TaskQueries.ts';

/**
 * Task Aggregated Listener: Reachability Sync
 *
 * Logic:
 * 1. Consumes SYNC_TASK_REACHABILITY signals.
 * 2. If 'ADD': Executes transitive closure expansion via Bridge Cross-Join.
 * 3. If 'REMOVE': Executes graph contraction and repair (Recursive Repair).
 * 4. Syncs project-wide task graph counters after repair.
 */
//FUTURE: Optimise for database lock    .
export class TaskAggregated_ReachabilitySyncListener {
    async init() {
        logger.info('[Task -> Reachability Listener] Initializing');

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'task-reachability-sync-group',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.SYNC_TASK_REACHABILITY]:
                    this.handleSync.bind(this),
            },
            { batch: true },
        );
    }

    private async handleSync(events: any[]) {
        if (!events.length) return;

        logger.info(
            `[Graph Engine] Processing batched signals: ${events.length} projects`,
        );

        await db.transaction().execute(async (trx) => {
            for (const e of events) {
                const { projectId, links } = e.data;

                if (!links || !Array.isArray(links)) {
                    logger.warn(
                        `[Graph Engine] Received reachability signal without links for project ${projectId}`,
                    );
                    continue;
                }

                logger.info(
                    `[Graph Engine] Applying ${links.length} reachability updates for project ${projectId}`,
                );

                for (const link of links) {
                    if (link.action === 'ADD') {
                        await expandTaskReachability(
                            trx,
                            projectId,
                            link.sourceTaskId,
                            link.targetTaskId,
                        );
                    } else if (link.action === 'REMOVE') {
                        await contractTaskReachability(
                            trx,
                            projectId,
                            link.sourceTaskId,
                            link.targetTaskId,
                        );
                    }
                }

                // Sync denormalized incoming/outgoing counts for the project UI once per signal
                await syncTaskGraphCounters(trx, projectId);
            }
        });
    }
}
