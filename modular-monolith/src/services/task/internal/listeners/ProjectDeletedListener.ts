import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllProjectTasks } from '../TaskQueries';
import { eventBus } from '../../../../utils/EventBus';

export class ProjectDeletedListener {
    async init() {
        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT, 
            'task-cleanup-group',
            async (event: any) => {
                if (event.type === KAFKA_EVENTS.PROJECT.DELETED) {
                    const { projectId } = event.data;
                    console.log(`[Task Service] Cleaning up tasks for project: ${projectId}`);
                    await deleteAllProjectTasks(projectId);
                }
            }
        );
        
        console.log('[Task Service] ProjectDeletedListener started');
    }

    async stop() {
        // Managed by eventBus.destroy()
    }
}

export const projectDeletedListener = new ProjectDeletedListener();
