import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus';
import { deleteAllProjectTasks } from '../TaskQueries';

export class ProjectDeletedListener {
    async init() {
        await eventBus.subscribe('task-cleanup-group', {
            [KAFKA_EVENTS.PROJECT.DELETED]: async (data) => {
                const { projectId } = data;
                console.log(
                    `[Task Service] Cleaning up tasks for project: ${projectId}`,
                );
                await deleteAllProjectTasks(projectId);
            },
        });
        console.log('[Task Service] ProjectDeletedListener started');
    }

    async stop() {}
}

export const projectDeletedListener = new ProjectDeletedListener();
