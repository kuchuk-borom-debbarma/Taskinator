import type { TaskTrigger } from '../../../TaskTriggerService.ts';
import {
    getParentTaskTeamMembers,
    getTaskTeamMembers,
} from '../../TaskTriggerQueries.ts';

/**
 * Trigger that will notify the team assigned to the parent task
 * @param taskId
 * @param trigger
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
        `[Trigger Engine] Notifying parent team members of task ${taskId}: ${members.join(', ')}`,
    );
    // TODO: Integrate with real Notification Service when available
};

/**
 * Trigger that will notify the team assigned to the task
 * @param taskId
 * @param trigger
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
        `[Trigger Engine] Notifying team members of task ${taskId}: ${members.join(', ')}`,
    );
    // TODO: Integrate with real Notification Service when available
};
