import { db } from '../../../database';
import { logger } from '../../../logger';
import eventBus from '../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../utils/event-bus/idempotency.ts';
import type { DomainEvent } from '../../../utils/event-bus/types.ts';
import { TaskCleanupHandler } from './handlers/TaskCleanupHandler.ts';
import { TaskCountHandler } from './handlers/TaskCountHandler.ts';

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

        await db.transaction().execute(async (trx) => {
            // [1] Explicit Idempotency Claim
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'task-aggregator-group',
            );

            if (unprocessed.length === 0) {
                logger.info(
                    '[Task Coordinator] Batch already processed, skipping',
                );
                return;
            }

            logger.info(
                `[Task Coordinator] Processing batch of ${unprocessed.length} new events`,
            );

            // [2] Semantic Folding & Count Delta Preparation
            const projectIncrements = new Map<string, number>();
            const teamIncrements = new Map<string, number>();
            const memberAssignments = new Map<string, any[]>();
            const deletedTaskIds: string[] = [];

            for (const event of unprocessed) {
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
                                (teamIncrements.get(event.data.teamId) || 0) -
                                    1,
                            );
                        }
                        deletedTaskIds.push(taskId);
                        break;

                    case KAFKA_EVENTS.TASK.UPDATED: {
                        const { old, new: newState } = event.data;

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
                                    (teamIncrements.get(newState.teamId) || 0) +
                                        1,
                                );
                            }
                        }

                        if (old.memberId !== newState.memberId) {
                            if (newState.memberId) {
                                const list =
                                    memberAssignments.get(newState.memberId) ||
                                    [];
                                list.push({
                                    taskId,
                                    projectId,
                                    title: newState.title,
                                    type: 'ASSIGNED',
                                });
                                memberAssignments.set(newState.memberId, list);
                            }
                        }
                        break;
                    }
                }
            }

            // [3] Delegate to Handlers within the SAME transaction
            await Promise.all([
                this.countHandler.handle(
                    projectIncrements,
                    teamIncrements,
                    trx,
                ),
                this.countHandler.handleMemberAssignments(
                    memberAssignments,
                    trx,
                ),
                this.cleanupHandler.handle(deletedTaskIds, trx),
            ]);
        });
    }
}
