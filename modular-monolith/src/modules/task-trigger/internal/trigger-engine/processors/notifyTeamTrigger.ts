import type { TaskTrigger } from '../../../TaskTriggerService.ts';
import {
    getParentTaskTeamMembers,
    getTaskTeamMembers,
} from '../../TaskTriggerQueries.ts';
import eventBus, { KAFKA_EVENTS } from '../../../../../utils/EventBus.ts';

/**
 * Trigger that will notify the team assigned to the parent task
 * @param taskId
 * @param trigger
 * @param updates
 */
export const notifyParentTeamTrigger = async (
    taskId: string,
    trigger: TaskTrigger,
    updates: any,
) => {
    if (trigger.triggerType !== 'NOTIFY_PARENT_TEAM') {
        throw new Error(`Trigger type ${trigger.triggerType} not supported`);
    }

    const members = await getParentTaskTeamMembers(taskId);
    if (members.length === 0) {
        console.log(
            `[Trigger Engine] No members to notify for parent team of task ${taskId}`,
        );
        return;
    }

    console.log(
        `[Trigger Engine] Publishing notification request for parent team members of task ${taskId}`,
    );

    await eventBus.publish(KAFKA_EVENTS.NOTIFICATION.REQUESTED, {
        key: taskId,
        data: {
            userIds: members,
            title: `Parent Task Notification: ${trigger.name}`,
            message: `Automation '${trigger.name}' triggered on task associated with your parent team.`,
            type: 'TEAM_NOTIFICATION',
            metadata: { taskId, triggerId: trigger.id, projectId: trigger.projectId }
        }
    });
};

/**
 * Trigger that will notify the team assigned to the task
 * @param taskId
 * @param trigger
 * @param updates
 */
export const notifyTaskTeamTrigger = async (
    taskId: string,
    trigger: TaskTrigger,
    updates: any,
) => {
    if (trigger.triggerType !== 'NOTIFY_TASK_TEAM') {
        throw new Error(`Trigger type ${trigger.triggerType} not supported`);
    }

    const members = await getTaskTeamMembers(taskId);
    if (members.length === 0) {
        console.log(
            `[Trigger Engine] No members to notify for team of task ${taskId}`,
        );
        return;
    }

    console.log(
        `[Trigger Engine] Publishing notification request for team members of task ${taskId}`,
    );

    await eventBus.publish(KAFKA_EVENTS.NOTIFICATION.REQUESTED, {
        key: taskId,
        data: {
            userIds: members,
            title: `Task Notification: ${trigger.name}`,
            message: `Automation '${trigger.name}' triggered on task associated with your team.`,
            type: 'TEAM_NOTIFICATION',
            metadata: { taskId, triggerId: trigger.id, projectId: trigger.projectId }
        }
    });
};
