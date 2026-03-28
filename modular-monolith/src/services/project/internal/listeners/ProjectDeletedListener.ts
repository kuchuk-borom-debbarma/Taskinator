import { kafka } from '../../../../kafka';
import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllProjectMembers } from '../ProjectQueries';

export class MemberCleanupListener {
    private consumer = kafka.consumer({ groupId: 'member-cleanup-group' });

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
                    console.log(`[Project Service] Cleaning up members for project: ${projectId}`);
                    await deleteAllProjectMembers(projectId);
                }
            },
        });
        
        console.log('[Project Service] MemberCleanupListener started');
    }

    async stop() {
        await this.consumer.disconnect();
    }
}

export const memberCleanupListener = new MemberCleanupListener();
