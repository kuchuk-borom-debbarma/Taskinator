import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { logger } from '../../../../logger';
import { db } from '../../../../database';
import { claimEventsAtomic } from '../../../../utils/event-bus/idempotency.ts';

import { purgeLocalTaskDataByTaskIds } from '../TaskQueries.ts';

/**
 * Task Module Listener for Task Deletion.
 * Responsible for cleaning up local links and reachability data for deleted tasks.
 */
export class TaskDeleted_TaskCleanupListener {
    async init() {
        logger.info(
            '[Task Module] Initializing TaskDeleted Task Cleanup Listener',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'task-local-cleanup-group',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.DELETED]:
                    this.handleTaskDeletion.bind(this),
            },
            { batch: true, manualIdempotency: true },
        );
    }

    private async handleTaskDeletion(events: DomainEvent[]) {
        if (events.length === 0) return;

        const allTaskIds = events.flatMap((e) => e.data.taskIds);
        if (allTaskIds.length === 0) return;

        await db.transaction().execute(async (trx) => {
            // 1. Atomic Claim
            const approvedEvents = await claimEventsAtomic(
                trx,
                events,
                'task-local-cleanup-group',
            );
            if (approvedEvents.length === 0) return;

            const taskIds = approvedEvents.flatMap((e) => e.data.taskIds);

            logger.info(
                `[Task Module] Cleaning up local data for ${taskIds.length} deleted tasks`,
            );

            // 2. Delegate to Task Repository
            await purgeLocalTaskDataByTaskIds(trx, taskIds);
        });
    }
}
