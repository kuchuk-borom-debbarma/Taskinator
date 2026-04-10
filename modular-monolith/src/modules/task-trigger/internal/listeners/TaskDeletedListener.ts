import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus.ts';
import { deleteTaskTriggers } from '../TaskTriggerQueries.ts';

export class TaskDeletedListener {
    async init() {
        await eventBus.subscribe('trigger-task-deleted-group', {
            [KAFKA_EVENTS.PROJECT_TASK.PARENT_DELETED]: async (data: any) => {
                console.log(
                    `[Trigger Service] Cleaning up triggers for parent task: ${data.id}`,
                );
                await deleteTaskTriggers([data.id]);
            },
            [KAFKA_EVENTS.PROJECT_TASK.CHILDREN_DELETED]: async (data: {
                childTaskIds: string[];
            }) => {
                if (data.childTaskIds && data.childTaskIds.length > 0) {
                    console.log(
                        `[Trigger Service] Cleaning up triggers for ${data.childTaskIds.length} child tasks`,
                    );
                    await deleteTaskTriggers(data.childTaskIds);
                }
            },
        });
        console.log('[Trigger Service] TaskDeletedListener started');
    }

    async stop() {}
}

export const taskDeletedListener = new TaskDeletedListener();
