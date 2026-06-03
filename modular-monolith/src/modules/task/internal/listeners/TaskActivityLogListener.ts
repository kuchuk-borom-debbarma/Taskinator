import { db } from '../../../../infra/database/index.ts';
import { logger } from '../../../../infra/logger/index.ts';
import eventBus from '../../../../infra/utils/EventBus.ts';
import {
    EVENT_STREAMS,
    EVENT_TYPES,
} from '../../../../infra/utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus/index.ts';

/**
 * TaskActivityLogListener
 *
 * Asynchronously processes task creation and update events from the outbox
 * and stores them in the task_activity_log table for mutation history.
 */
export class TaskActivityLogListener {
    async init() {
        logger.info('[Task -> Activity Log Listener] Initializing');

        await eventBus.subscribe(
            EVENT_STREAMS.TASK,
            'task-activity-log-group',
            {
                [EVENT_TYPES.TASK.CREATED]: this.handleCreated.bind(this),
                [EVENT_TYPES.TASK.UPDATED]: this.handleUpdated.bind(this),
            },
            { batch: true },
        );
    }

    private async handleCreated(events: DomainEvent[]) {
        if (events.length === 0) return;
        logger.info(
            `[Task Activity Log] Logging creation for batch of ${events.length} tasks`,
        );

        const logs = events.map((event) => {
            const data = event.data;
            const payload: Record<string, any> = {
                title: data.title,
                status: data.status,
                priority: data.priority,
                dueDate: data.dueDate,
                teamId: data.teamId,
                memberId: data.memberId,
                actorId: data.actorId,
            };

            return {
                fk_task_id: data.taskId,
                fk_project_id: data.projectId,
                fk_user_id: data.actorId,
                action_type: 'task.created',
                payload: payload,
            };
        });

        await db
            .insertInto('task_activity_log')
            .values(logs as any)
            .execute();
    }

    private async handleUpdated(events: DomainEvent[]) {
        if (events.length === 0) return;
        logger.info(
            `[Task Activity Log] Logging updates for batch of ${events.length} tasks`,
        );

        const logs: any[] = [];

        for (const event of events) {
            const data = event.data;
            const { taskId, projectId, actorId, old, new: newState } = data;

            if (!old || !newState) {
                logger.warn(
                    `[Task Activity Log] Skipping update event for task ${taskId} due to missing old/new state`,
                );
                continue;
            }

            // Find changed fields
            const changes: Record<string, { old: any; new: any }> = {};

            for (const [key, newVal] of Object.entries(newState)) {
                const oldVal = (old as any)[key];
                if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                    changes[key] = {
                        old: oldVal,
                        new: newVal,
                    };
                }
            }

            // If no fields changed, skip writing a log row
            if (Object.keys(changes).length === 0) {
                continue;
            }

            logs.push({
                fk_task_id: taskId,
                fk_project_id: projectId,
                fk_user_id: actorId,
                action_type: 'task.updated',
                payload: {
                    changes,
                    actorId,
                },
            });
        }

        if (logs.length > 0) {
            await db.insertInto('task_activity_log').values(logs).execute();
        }
    }
}
