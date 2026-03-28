import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { unassignMemberFromAllTasks } from '../TaskQueries';
import { eventBus } from '../../../../utils/EventBus';

export class ProjectMemberDeletedListener {
    async init() {
        await eventBus.on(KAFKA_TOPICS.PROJECT_MEMBER, 'task-member-cleanup-group', {
            [KAFKA_EVENTS.PROJECT_MEMBER.DELETED]: async (data) => {
                const { projectId, userId } = data;
                console.log(`[Task Service] Unassigning member ${userId} from tasks in project ${projectId}`);
                await unassignMemberFromAllTasks(projectId, userId);
            }
        });
        console.log('[Task Service] ProjectMemberDeletedListener started');
    }

    async stop() {}
}

export const projectMemberDeletedListener = new ProjectMemberDeletedListener();
