import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllProjectTasks } from '../TaskQueries';
import { eventBus } from '../../../../utils/EventBus';
import { withIdempotency } from '../../../../utils/idempotency';

export class ProjectDeletedListener {
    async init() {
        const GROUP_ID = 'task-cleanup-group';
        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT, 
            GROUP_ID,
            async (event: any) => {
                if (event.type === KAFKA_EVENTS.PROJECT.DELETED) {
                    await withIdempotency(event.eventId, GROUP_ID, async () => {
                        const { projectId } = event.data;
                        console.log(`[Task Service] Cleaning up tasks for project: ${projectId}`);
                        await deleteAllProjectTasks(projectId);
                    });
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
