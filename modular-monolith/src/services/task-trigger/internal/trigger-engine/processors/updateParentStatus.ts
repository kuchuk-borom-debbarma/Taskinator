import type {TaskTrigger} from "../../../TaskTriggerService.ts";
import {updateParentTaskStatus} from "../../TaskTriggerQueries.ts";

/**
 * Update the status of parent task
 * @param taskId id of the task which got triggered.
 * @param trigger The trigger that was executed.
 */
export const updateParentStatusTrigger = async (
    taskId: string, trigger: TaskTrigger
) => {
    if (trigger.triggerType !== "UPDATE_PARENT_STATUS") {
        throw new Error(`Trigger type ${trigger.triggerType} not supported`);
    }
    const {parentStatusToSet = undefined} = trigger.triggerData;
    if (parentStatusToSet == undefined) {
        throw new Error(`parentStatusToSet: ${parentStatusToSet} invalid for trigger type UPDATE_PARENT_STATUS. Received : ${JSON.stringify(trigger.triggerData)}`);
    }

    console.log(`[Trigger Engine] Updating parent status for taskId: ${taskId} to ${parentStatusToSet}`);
    await updateParentTaskStatus({
        taskId,
        statusToSet: parentStatusToSet
    });
}