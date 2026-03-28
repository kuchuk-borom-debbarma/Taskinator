import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { unassignTeamFromAllTasks } from '../TaskQueries';
import { eventBus } from '../../../../utils/EventBus';
import { withBatchIdempotency } from '../../../../utils/idempotency';

export class ProjectTeamDeletedListener {
    async init() {
        const GROUP_ID = 'task-team-cleanup-group';
        await eventBus.subscribeBatch(
            KAFKA_TOPICS.PROJECT_TEAM,
            GROUP_ID,
            async (events: any[]) => {
                const deletedEvents = events.filter(e => e.type === KAFKA_EVENTS.PROJECT_TEAM.DELETED);
                
                await withBatchIdempotency(deletedEvents, GROUP_ID, async (unprocessed) => {
                    for (const event of unprocessed) {
                        const { projectId, teamId } = event.data;
                        console.log(`[Task Service] Unassigning team ${teamId} from tasks in project ${projectId}`);
                        await unassignTeamFromAllTasks(projectId, teamId);
                    }
                });
            }
        );
        
        console.log('[Task Service] ProjectTeamDeletedListener started');
    }

    async stop() {}
}

export const projectTeamDeletedListener = new ProjectTeamDeletedListener();
