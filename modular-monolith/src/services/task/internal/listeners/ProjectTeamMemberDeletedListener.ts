import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { unassignMemberFromTeamTasks } from '../TaskQueries';
import { eventBus } from '../../../../utils/EventBus';

export class ProjectTeamMemberDeletedListener {
    async init() {
        await eventBus.on(KAFKA_TOPICS.PROJECT_TEAM_MEMBER, 'task-team-member-cleanup-group', {
            [KAFKA_EVENTS.PROJECT_TEAM_MEMBER.DELETED]: async (data) => {
                const { projectId, teamId, userId } = data;
                console.log(`[Task Service] Unassigning user ${userId} from tasks in team ${teamId} for project ${projectId}`);
                await unassignMemberFromTeamTasks(projectId, teamId, userId);
            }
        });
        console.log('[Task Service] ProjectTeamMemberDeletedListener started');
    }

    async stop() {}
}

export const projectTeamMemberDeletedListener = new ProjectTeamMemberDeletedListener();
