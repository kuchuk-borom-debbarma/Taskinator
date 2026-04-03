import type {TaskTrigger} from "../../TaskTriggerService.ts";
import processor from "../trigger-engine";
import eventBus, {KAFKA_EVENTS} from "../../../../utils/EventBus.ts";


//TODO batch processing task trigger handler not solo
export class TaskTriggerListener {
    async init() {
        await eventBus.subscribe('task-trigger-processor-group', {
            [KAFKA_EVENTS.PROJECT_TASK_TRIGGER.TRIGGER]: async (data: {
                taskId: string,
                trigger: TaskTrigger
            }) => {
                const {taskId, trigger} = data;
                const handler = processor[trigger.triggerType] as (taskId: string, trigger: TaskTrigger) => Promise<void>;
                if (handler) {
                    await handler(taskId, trigger);
                } else {
                    console.warn(`[Trigger Listener] No handler for trigger type: ${trigger.triggerType}`);
                }
            },
        });
    }

    async stop() {
    }
}

export const taskTriggerListener = new TaskTriggerListener();
