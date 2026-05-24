import { logger } from '../../../../infra/logger';
import eventBus from '../../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../infra/utils/event-bus/constants.ts';
import { taskService } from '../../index.ts';
import type { TaskReachabilityLinkChange } from '../../TaskService.ts';

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

    private async handleSync(
        events: DomainEvent<{
            projectId: string;
            links: TaskReachabilityLinkChange[];
        }>[],
    ) {
        await taskService.handleTaskReachabilitySync(events);
    }
}
