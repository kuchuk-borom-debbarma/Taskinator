import { kafka } from '../../../../kafka';
import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllProjectTasks } from '../TaskQueries';

export class ProjectDeletedListener {
    private consumer = kafka.consumer({ groupId: 'task-cleanup-group' });

    async init() {
        await this.consumer.connect();
        await this.consumer.subscribe({ 
            topic: KAFKA_TOPICS.PROJECT, 
            fromBeginning: false 
        });

        await this.consumer.run({
            eachMessage: async ({ message }) => {
                const content = message.value?.toString();
                if (!content) return;

                const event = JSON.parse(content);

                if (event.type === KAFKA_EVENTS.PROJECT.DELETED) {
                    const { projectId } = event.data;
                    console.log(`[Task Service] Cleaning up tasks for project: ${projectId}`);
                    await deleteAllProjectTasks(projectId);
                }
            },
        });
        
        console.log('[Task Service] ProjectDeletedListener started');
    }

    async stop() {
        await this.consumer.disconnect();
    }
}

export const projectDeletedListener = new ProjectDeletedListener();
