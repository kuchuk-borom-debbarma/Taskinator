import type { TaskTrigger } from '../../../TaskTriggerService.ts';
import { updateTaskStatus, getTaskById } from '../../TaskTriggerQueries.ts';

/**
 * Trigger that unlocks a sequence by updating another task's status.
 * Useful for Task A -> Task B dependencies.
 * @param taskId Task that just updated
 * @param trigger
 * @param updates
 */
export const sequenceUnlockTrigger = async (
    taskId: string,
    trigger: TaskTrigger,
    updates: any,
) => {
    if (trigger.triggerType !== 'SEQUENCE_UNLOCK') {
        throw new Error(`Trigger type ${trigger.triggerType} not supported`);
    }

    const { targetTaskId, targetStatusToSet = 'TODO' } = trigger.triggerData;
    if (!targetTaskId) {
        throw new Error(`targetTaskId is required for trigger type SEQUENCE_UNLOCK`);
    }

    // Check if current task just moved to 'DONE'
    const currentTask = await getTaskById(taskId);
    if (!currentTask || currentTask.status !== 'DONE') {
        return; // Only unlock if current task is DONE
    }

    console.log(
        `[Trigger Engine] Sequence unlock for taskId: ${taskId}. Unlocking target taskId: ${targetTaskId} to ${targetStatusToSet}`,
    );
    await updateTaskStatus({
        taskId: targetTaskId,
        statusToSet: targetStatusToSet,
    });
};
