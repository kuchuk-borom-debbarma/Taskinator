import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { removeUserFromAllTeams } from '../TeamQueries';
import { eventBus } from '../../../../utils/EventBus';

export class ProjectMemberDeletedListener {
    async init() {
        await eventBus.on(KAFKA_TOPICS.PROJECT_MEMBER, 'team-member-cleanup-group', {
            [KAFKA_EVENTS.PROJECT_MEMBER.DELETED]: async (data) => {
                const { projectId, userId } = data;
                console.log(`[Team Service] Removing user ${userId} from all teams in project ${projectId}`);
                await removeUserFromAllTeams(projectId, userId);
            }
        });
        console.log('[Team Service] ProjectMemberDeletedListener started');
    }

    async stop() {}
}

export const projectMemberDeletedListener = new ProjectMemberDeletedListener();
