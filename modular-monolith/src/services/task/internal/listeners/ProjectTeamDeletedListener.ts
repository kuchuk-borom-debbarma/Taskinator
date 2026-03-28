import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { unassignTeamFromAllTasks } from '../TaskQueries';
import { eventBus } from '../../../../utils/EventBus';
import { withIdempotency } from '../../../../utils/idempotency';

export class ProjectTeamDeletedListener {
    async init() {
        const GROUP_ID = 'task-team-cleanup-group';
        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_TEAM,
            GROUP_ID,
            async (event: any) => {
                if (event.type === KAFKA_EVENTS.PROJECT_TEAM.DELETED) {
                    await withIdempotency(event.eventId, GROUP_ID, async () => {
                        const { projectId, teamId } = event.data;
                        console.log(`[Task Service] Unassigning team ${teamId} from tasks in project ${projectId}`);
                        await unassignTeamFromAllTasks(projectId, teamId);
                    });
                }
            }
        );
        
        console.log('[Task Service] ProjectTeamDeletedListener started');
    }

    async stop() {}
}

export const projectTeamDeletedListener = new ProjectTeamDeletedListener();
