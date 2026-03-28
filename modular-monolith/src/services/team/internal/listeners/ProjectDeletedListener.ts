import { kafka } from '../../../../kafka';
import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllProjectTeams } from '../TeamQueries';

export class TeamCleanupListener {
    private consumer = kafka.consumer({ groupId: 'team-cleanup-group' });

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
                    console.log(`[Team Service] Cleaning up teams for project: ${projectId}`);
                    await deleteAllProjectTeams(projectId);
                }
            },
        });
        
        console.log('[Team Service] TeamCleanupListener started');
    }

    async stop() {
        await this.consumer.disconnect();
    }
}

export const teamCleanupListener = new TeamCleanupListener();
