import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllTeamMembers } from '../TeamQueries';
import { eventBus } from '../../../../utils/EventBus';

export class ProjectTeamDeletedListener {
    async init() {
        await eventBus.on(KAFKA_TOPICS.PROJECT_TEAM, 'team-member-cleanup-group', {
            [KAFKA_EVENTS.PROJECT_TEAM.DELETED]: async (data) => {
                const { projectId, teamId } = data;
                console.log(`[Team Service] Deleting members for team ${teamId} in project ${projectId}`);
                await deleteAllTeamMembers(projectId, teamId);
            }
        });
        console.log('[Team Service] ProjectTeamDeletedListener started');
    }

    async stop() {}
}

export const projectTeamDeletedListener = new ProjectTeamDeletedListener();
