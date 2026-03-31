import type {TaskTrigger} from "../../TaskTriggerService.ts";

type TriggerProcessor = {
    [K in TaskTrigger["triggerType"]]: (taskId: string, trigger: Extract<TaskTrigger, {
        triggerType: K
    }>) => Promise<void>;
};

const processor: TriggerProcessor = {
    UPDATE_PARENT_STATUS: async (taskId, trigger) => {
        console.log(`Processor: ${taskId} trigger status: ${trigger.triggerType}`);
    }
};

export default processor;