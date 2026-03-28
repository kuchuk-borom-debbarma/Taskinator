import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { unassignTeamFromAllTasks } from '../TaskQueries';
import { eventBus } from '../../../../utils/EventBus';

export class ProjectTeamDeletedListener {
    async init() {
        await eventBus.on(KAFKA_TOPICS.PROJECT_TEAM, 'task-team-cleanup-group', {
            [KAFKA_EVENTS.PROJECT_TEAM.DELETED]: async (data) => {
                const { projectId, teamId } = data;
                console.log(`[Task Service] Unassigning team ${teamId} from tasks in project ${projectId}`);
                await unassignTeamFromAllTasks(projectId, teamId);
            }
        });
        console.log('[Task Service] ProjectTeamDeletedListener started');
    }

    async stop() {}
}

export const projectTeamDeletedListener = new ProjectTeamDeletedListener();
