import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllProjectTasks } from '../TaskQueries';
import { eventBus } from '../../../../utils/EventBus';

export class ProjectDeletedListener {
    async init() {
        await eventBus.on(KAFKA_TOPICS.PROJECT, 'task-cleanup-group', {
            [KAFKA_EVENTS.PROJECT.DELETED]: async (data) => {
                const { projectId } = data;
                console.log(`[Task Service] Cleaning up tasks for project: ${projectId}`);
                await deleteAllProjectTasks(projectId);
            }
        });
        console.log('[Task Service] ProjectDeletedListener started');
    }

    async stop() {}
}

export const projectDeletedListener = new ProjectDeletedListener();
