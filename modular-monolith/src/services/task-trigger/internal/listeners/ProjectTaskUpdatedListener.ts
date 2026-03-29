import {eventBus} from "../../../../utils/EventBus.ts";
import {KAFKA_EVENTS, KAFKA_TOPICS} from "../../../../utils/kafka.ts";

export class TaskTriggerListener {
    async init() {
        await eventBus.on(KAFKA_TOPICS.PROJECT_TASK, 'task-trigger-group', {
            [KAFKA_EVENTS.PROJECT_TASK.UPDATED]: async (data) => {
                const {taskId} = data;
                console.log(
                    `[Task Trigger Service] Publishing event to trigger all trigger assigned to task ${taskId}`,
                );
                //TODO Fetch all triggers of the task and produce event event for each. This needs to be consumed by another listener. The TriggerEngineConsumer
            },
        });
        console.log('[Task Service] ProjectDeletedListener started');
    }

    async stop() {
    }
}

export const taskTriggerListener = new TaskTriggerListener();
