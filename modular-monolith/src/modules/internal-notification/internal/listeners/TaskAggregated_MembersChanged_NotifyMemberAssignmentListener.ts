import { logger } from '../../../../logger';
import eventBus from '../../../../utils/EventBus.ts';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../utils/event-bus/constants.ts';
import type { DomainEvent } from '../../../../utils/event-bus/types.ts';
import { insertNotificationsBatch } from '../InternalNotificationQueries.ts';

/**
 * Listens for aggregated task assignment signals and creates internal notifications.
 */
export class TaskAggregated_MembersChanged_NotifyMemberAssignmentListener {
    async init() {
        logger.info(
            '[Notification Module] Monitoring TASK_AGGREGATED.MEMBERS_CHANGED',
        );

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK_AGGREGATED,
            'notification-task-assignment-sync',
            {
                [KAFKA_EVENTS.TASK_AGGREGATED.MEMBERS_CHANGED]:
                    this.handleAssignments.bind(this),
            },
            { batch: true },
        );
    }

    private async handleAssignments(events: DomainEvent[]) {
        if (events.length === 0) return;

        const notifications = events.flatMap((event) => {
            const { userId, tasks } = event.data;
            return (tasks as any[]).map((task) => ({
                userId,
                title: 'New Task Assignment',
                message: `You have been assigned to task: ${task.title}`,
                type: 'TASK_ASSIGNED',
                metadata: {
                    taskId: task.taskId,
                    projectId: task.projectId,
                },
            }));
        });

        if (notifications.length === 0) return;

        logger.info(
            `[Notification Module] Creating ${notifications.length} assignments notifications`,
        );

        try {
            await insertNotificationsBatch(notifications);
        } catch (error) {
            logger.error(
                '[Notification Module] Failed to create notifications:',
                error,
            );
            throw error;
        }
    }
}
