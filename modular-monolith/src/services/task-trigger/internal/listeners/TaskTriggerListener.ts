import type {TaskTrigger} from "../../TaskTriggerService.ts";
import processor from "../trigger-engine";
import {eventBus, KAFKA_EVENTS} from "../../../../utils/EventBus.ts";

export class TaskTriggerListener {
    async init() {
        await eventBus.subscribe('task-trigger-processor-group', {
            [KAFKA_EVENTS.PROJECT_TASK_TRIGGER.TRIGGER]: async (data: {
                taskId: string,
                trigger: TaskTrigger
            }) => {
                const {taskId, trigger} = data
                const handler = processor[trigger.triggerType];
                if (handler) {
                    await handler(taskId, trigger);
                }
            },
        });
        console.log('[Task Service] ProjectDeletedListener started');
    }

    async stop() {
    }
}

export const taskTriggerListener = new TaskTriggerListener();
