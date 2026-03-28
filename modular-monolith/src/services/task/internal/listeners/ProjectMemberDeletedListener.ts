import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { unassignMemberFromAllTasks } from '../TaskQueries';
import { eventBus } from '../../../../utils/EventBus';
import { withIdempotency } from '../../../../utils/idempotency';

export class ProjectMemberDeletedListener {
    async init() {
        const GROUP_ID = 'task-member-cleanup-group';
        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_MEMBER,
            GROUP_ID,
            async (event: any) => {
                if (event.type === KAFKA_EVENTS.PROJECT_MEMBER.DELETED) {
                    await withIdempotency(event.eventId, GROUP_ID, async () => {
                        const { projectId, userId } = event.data;
                        console.log(`[Task Service] Unassigning member ${userId} from tasks in project ${projectId}`);
                        await unassignMemberFromAllTasks(projectId, userId);
                    });
                }
            }
        );
        
        console.log('[Task Service] ProjectMemberDeletedListener started');
    }

    async stop() {}
}

export const projectMemberDeletedListener = new ProjectMemberDeletedListener();
