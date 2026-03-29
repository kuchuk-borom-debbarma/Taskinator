import { KAFKA_EVENTS, eventBus } from '../../../../utils/EventBus';
import { unassignMemberFromTeamTasks } from '../TaskQueries';

export class ProjectTeamMemberDeletedListener {
    async init() {
        await eventBus.subscribe('task-team-member-cleanup-group', {
            [KAFKA_EVENTS.PROJECT_TEAM_MEMBER.DELETED]: async (data) => {
                const { projectId, teamId, userId } = data;
                console.log(
                    `[Task Service] Unassigning user ${userId} from tasks in team ${teamId} for project ${projectId}`,
                );
                await unassignMemberFromTeamTasks(projectId, teamId, userId);
            },
        });
        console.log('[Task Service] ProjectTeamMemberDeletedListener started');
    }

    async stop() {}
}

export const projectTeamMemberDeletedListener =
    new ProjectTeamMemberDeletedListener();
