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
        );
    }

    private async handleSync(data: any) {
        const { projectId, sourceTaskId, targetTaskId, action } = data;

        logger.info(
            `[Graph Engine] Processing ${action} signal for ${sourceTaskId} -> ${targetTaskId}`,
        );

        await db.transaction().execute(async (trx) => {
            if (action === 'ADD') {
                await expandTaskReachability(
                    trx,
                    projectId,
                    sourceTaskId,
                    targetTaskId,
                );
            } else if (action === 'REMOVE') {
                await contractTaskReachability(
                    trx,
                    projectId,
                    sourceTaskId,
                    targetTaskId,
                );
            }

            // Sync denormalized incoming/outgoing counts for the project UI
            await syncTaskGraphCounters(trx, projectId);
        });
    }
}
