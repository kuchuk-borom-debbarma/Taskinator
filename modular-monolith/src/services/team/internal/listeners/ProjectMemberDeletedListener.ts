import { kafka } from '../../../../kafka';
import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { removeUserFromAllTeams } from '../TeamQueries';

export class ProjectMemberDeletedListener {
    private consumer = kafka.consumer({ groupId: 'team-member-cleanup-group' });

    async init() {
        await this.consumer.connect();
        await this.consumer.subscribe({ 
            topic: KAFKA_TOPICS.PROJECT_MEMBER, 
            fromBeginning: false 
        });

        await this.consumer.run({
            eachMessage: async ({ message }) => {
                const content = message.value?.toString();
                if (!content) return;

                const event = JSON.parse(content);

                if (event.type === KAFKA_EVENTS.PROJECT_MEMBER.DELETED) {
                    const { projectId, userId } = event.data;
                    console.log(`[Team Service] Removing user ${userId} from all teams in project ${projectId}`);
                    await removeUserFromAllTeams(projectId, userId);
                }
            },
        });
        
        console.log('[Team Service] ProjectMemberDeletedListener started');
    }

    async stop() {
        await this.consumer.disconnect();
    }
}

export const projectMemberDeletedListener = new ProjectMemberDeletedListener();
