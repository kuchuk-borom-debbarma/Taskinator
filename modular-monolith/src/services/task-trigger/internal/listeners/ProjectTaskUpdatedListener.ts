import {KAFKA_EVENTS, eventBus, KAFKA_TOPICS} from '../../../../utils/EventBus.ts';
import {getTaskTriggersByTaskId} from "../TaskTriggerQueries.ts";

export class TaskUpdatedListener {
    async init() {
        await eventBus.subscribe('task-update-trigger-delegate-group', {
            [KAFKA_EVENTS.PROJECT_TASK.UPDATED]: async (data: {
                actorId: string;
                projectId: string;
                taskId: string;
            }) => {
                const {taskId, projectId} = data;
                console.log(
                    `[Task Trigger Service] Publishing event to trigger all trigger assigned to task ${taskId}`,
                );
                // Get triggers of the task
                //TODO batching for edge case
                const triggers = await getTaskTriggersByTaskId({taskId})
                // Publish events for each trigger that will be consumed by trigger engine consumer
                await eventBus.publish(KAFKA_EVENTS.PROJECT_TASK_TRIGGER.TRIGGER, {
                    key: projectId,
                    data: triggers.map((trigger) => ({
                        taskId,
                        trigger: trigger
                    }))
                })
                //TODO write consumer
            },
        });
        console.log('[Task Service] ProjectDeletedListener started');
    }

    async stop() {
    }
}

export const taskTriggerListener = new TaskUpdatedListener();
