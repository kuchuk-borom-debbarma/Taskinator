import type { TaskTrigger } from '../../../TaskTriggerService.ts';
import { countIncompleteChildren, updateTaskStatus, getTaskById } from '../../TaskTriggerQueries.ts';

/**
 * Trigger that prevents a parent task from being marked as 'DONE' if it has incomplete children.
 * @param taskId
 * @param trigger
 * @param updates
 */
export const blockParentDoneTrigger = async (
    taskId: string,
    trigger: TaskTrigger,
    updates: any,
) => {
    if (trigger.triggerType !== 'BLOCK_PARENT_DONE') {
        throw new Error(`Trigger type ${trigger.triggerType} not supported`);
    }

    // Check if parent just moved to 'DONE'
    const currentTask = await getTaskById(taskId);
    if (!currentTask || currentTask.status !== 'DONE') {
        return; // Only care if parent is marked as DONE
    }

    // Count incomplete children
    const incompleteChildrenCount = await countIncompleteChildren(taskId);
    if (incompleteChildrenCount > 0) {
        console.warn(
            `[Trigger Engine] Blocking taskId: ${taskId} from being DONE because it has ${incompleteChildrenCount} incomplete children. Reverting status.`,
        );

        // Revert parent status to IN_PROGRESS (default safety)
        await updateTaskStatus({
            taskId: taskId,
            statusToSet: trigger.triggerData.revertStatusTo || 'IN_PROGRESS',
        });
    }
};
