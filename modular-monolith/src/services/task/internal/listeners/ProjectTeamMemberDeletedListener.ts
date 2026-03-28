import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { unassignMemberFromTeamTasks } from '../TaskQueries';
import { eventBus } from '../../../../utils/EventBus';

export class ProjectTeamMemberDeletedListener {
    async init() {
        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_TEAM_MEMBER,
            'task-team-member-cleanup-group',
            async (event: any) => {
                if (event.type === KAFKA_EVENTS.PROJECT_TEAM_MEMBER.DELETED) {
                    const { projectId, teamId, userId } = event.data;
                    console.log(`[Task Service] Unassigning user ${userId} from tasks in team ${teamId} for project ${projectId}`);
                    await unassignMemberFromTeamTasks(projectId, teamId, userId);
                }
            }
        );
        
        console.log('[Task Service] ProjectTeamMemberDeletedListener started');
    }

    async stop() {}
}

export const projectTeamMemberDeletedListener = new ProjectTeamMemberDeletedListener();
