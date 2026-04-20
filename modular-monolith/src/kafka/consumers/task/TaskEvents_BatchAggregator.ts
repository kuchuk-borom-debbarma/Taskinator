import eventBus from '../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../utils/event-bus/types.ts';
import { logger } from '../../../logger';
import { TaskCountHandler } from './handlers/TaskCountHandler.ts';

export class TaskEvents_BatchAggregator {
    private countHandler = new TaskCountHandler();

    async init() {
        logger.info(
            '[TaskEvents -> Aggregator] Initializing Smart Consumer with TaskCountHandler',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK,
            'task-aggregator-group',
            {
                [KAFKA_EVENTS.TASK.CREATED]: this.handleTaskBatch.bind(this),
                [KAFKA_EVENTS.TASK.DELETED]: this.handleTaskBatch.bind(this),
            },
            { batch: true },
        );
    }

    private async handleTaskBatch(events: DomainEvent[]) {
        if (events.length === 0) return;

        logger.info(
            `[Task Coordinator] Processing batch of ${events.length} events`,
        );

        // 1. Semantic Folding (Cancellation Logic)
        // Group by TaskId to cancel out Create+Delete in same batch
        const taskBalance = new Map<
            string,
            { projectId: string; teamId: string | null; balance: number }
        >();

        for (const event of events) {
            const { taskId, projectId, teamId } = event.data;
            const current = taskBalance.get(taskId) || {
                projectId,
                teamId: teamId || null,
                balance: 0,
            };

            if (event.type === KAFKA_EVENTS.TASK.CREATED) {
                current.balance += 1;
            } else if (event.type === KAFKA_EVENTS.TASK.DELETED) {
                current.balance -= 1;
            }

            taskBalance.set(taskId, current);
        }

        // 2. Aggregate counts per Project and Team
        const projectIncrements = new Map<string, number>();
        const teamIncrements = new Map<string, number>();

        for (const state of taskBalance.values()) {
            if (state.balance === 0) continue;

            // Project level
            projectIncrements.set(
                state.projectId,
                (projectIncrements.get(state.projectId) || 0) + state.balance,
            );

            // Team level (if assigned)
            if (state.teamId) {
                teamIncrements.set(
                    state.teamId,
                    (teamIncrements.get(state.teamId) || 0) + state.balance,
                );
            }
        }

        // 3. Delegate to Handler
        await this.countHandler
            .handle(projectIncrements, teamIncrements)
            .catch((err: any) => {
                logger.error('[Task Coordinator] Count handler failed:', err);
            });
    }
}
