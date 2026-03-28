import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { unassignMemberFromAllTasks } from '../TaskQueries';
import { eventBus } from '../../../../utils/EventBus';

export class ProjectMemberDeletedListener {
    async init() {
        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_MEMBER,
            'task-member-cleanup-group',
            async (event: any) => {
                if (event.type === KAFKA_EVENTS.PROJECT_MEMBER.DELETED) {
                    const { projectId, userId } = event.data;
                    console.log(`[Task Service] Unassigning member ${userId} from tasks in project ${projectId}`);
                    await unassignMemberFromAllTasks(projectId, userId);
                }
            }
        );
        
        console.log('[Task Service] ProjectMemberDeletedListener started');
    }

    async stop() {}
}

export const projectMemberDeletedListener = new ProjectMemberDeletedListener();
