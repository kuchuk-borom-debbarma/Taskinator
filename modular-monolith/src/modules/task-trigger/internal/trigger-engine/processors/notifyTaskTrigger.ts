import type { TaskTrigger } from '../../../TaskTriggerService.ts';
import {
    getTargetTaskNotificationUsers,
} from '../../TaskTriggerQueries.ts';
import eventBus, { KAFKA_EVENTS } from '../../../../../utils/EventBus.ts';

/**
 * Trigger that will notify specific users based on task assignments.
 * Payload requires `targetTaskIds: string[]`.
 * @param taskId
 * @param trigger
 * @param updates
 */
export const notifyTaskTrigger = async (
    taskId: string,
    trigger: TaskTrigger,
    updates: any,
) => {
    if (trigger.triggerType !== 'NOTIFY_TASK') {
        throw new Error(`Trigger type ${trigger.triggerType} not supported`);
    }

    const targetTaskIds: string[] = (trigger.triggerData?.targetTaskIds || []).slice(0, 100);
    if (!targetTaskIds.length) {
        console.log(`[Trigger Engine] No targetTaskIds specified for NOTIFY_TASK on trigger ${trigger.id}`);
        return;
    }

    const members = await getTargetTaskNotificationUsers(targetTaskIds);

    if (members.length === 0) {
        console.log(
            `[Trigger Engine] No members to notify for targeting tasks [${targetTaskIds.join(', ')}] on trigger ${trigger.id}`,
        );
        return;
    }

    console.log(
        `[Trigger Engine] Publishing notification request for members of targeted tasks [${targetTaskIds.join(', ')}]`,
    );

    await eventBus.publish(KAFKA_EVENTS.NOTIFICATION.REQUESTED, {
        key: taskId,
        data: {
            userIds: members,
            title: `Task Notification: ${trigger.name}`,
            message: trigger.triggerData?.message || `Automation '${trigger.name}' triggered.`,
            type: 'TEAM_NOTIFICATION',
            metadata: { taskId, triggerId: trigger.id, projectId: trigger.projectId }
        }
    });
};
