import eventBus from '../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../utils/event-bus/types.ts';
import { logger } from '../../../logger';
import { TaskCountHandler } from './handlers/TaskCountHandler.ts';
import { TaskCleanupHandler } from './handlers/TaskCleanupHandler.ts';

export class TaskEvents_BatchAggregator {
    private countHandler = new TaskCountHandler();
    private cleanupHandler = new TaskCleanupHandler();

    async init() {
        logger.info(
            '[TaskEvents -> Aggregator] Initializing Smart Consumer with TaskCountHandler',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK,
            'task-aggregator-group',
            {
                [KAFKA_EVENTS.TASK.CREATED]: this.handleTaskBatch.bind(this),
                [KAFKA_EVENTS.TASK.UPDATED]: this.handleTaskBatch.bind(this),
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

        // 1. Semantic Folding & Count Delta Preparation
        const projectIncrements = new Map<string, number>();
        const teamIncrements = new Map<string, number>();

        // userId -> { taskId, projectId, title, type }[]
        const memberAssignments = new Map<string, any[]>();

        const deletedTaskIds: string[] = [];

        for (const event of events) {
            const { projectId, taskId } = event.data;

            switch (event.type) {
                case KAFKA_EVENTS.TASK.CREATED:
                    projectIncrements.set(
                        projectId,
                        (projectIncrements.get(projectId) || 0) + 1,
                    );
                    break;

                case KAFKA_EVENTS.TASK.DELETED:
                    projectIncrements.set(
                        projectId,
                        (projectIncrements.get(projectId) || 0) - 1,
                    );
                    if (event.data.teamId) {
                        teamIncrements.set(
                            event.data.teamId,
                            (teamIncrements.get(event.data.teamId) || 0) - 1,
                        );
                    }
                    deletedTaskIds.push(taskId);
                    break;

                case KAFKA_EVENTS.TASK.UPDATED:
                    const { old, new: newState } = event.data;

                    // A. Team Lifecycle counters
                    if (old.teamId !== newState.teamId) {
                        if (old.teamId) {
                            teamIncrements.set(
                                old.teamId,
                                (teamIncrements.get(old.teamId) || 0) - 1,
                            );
                        }
                        if (newState.teamId) {
                            teamIncrements.set(
                                newState.teamId,
                                (teamIncrements.get(newState.teamId) || 0) + 1,
                            );
                        }
                    }

                    // B. Member assignment signals
                    if (old.memberId !== newState.memberId) {
                        if (newState.memberId) {
                            const list =
                                memberAssignments.get(newState.memberId) || [];
                            list.push({
                                taskId,
                                projectId,
                                title: newState.title,
                                type: 'ASSIGNED',
                            });
                            memberAssignments.set(newState.memberId, list);
                        }
                        // Note: We could also track UNASSIGNED here if we want to notify on removal
                    }
                    break;
            }
        }

        // 3. Delegate to Handlers
        await Promise.all([
            this.countHandler.handle(projectIncrements, teamIncrements),
            this.countHandler.handleMemberAssignments(memberAssignments),
            this.cleanupHandler.handle(deletedTaskIds),
        ]).catch((err: any) => {
            logger.error('[Task Coordinator] Signal handlers failed:', err);
        });
    }
}
