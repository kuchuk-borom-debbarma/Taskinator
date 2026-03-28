import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { unassignMemberFromTeamTasks } from '../TaskQueries';
import { eventBus } from '../../../../utils/EventBus';
import { withIdempotency } from '../../../../utils/idempotency';

export class ProjectTeamMemberDeletedListener {
    async init() {
        const GROUP_ID = 'task-team-member-cleanup-group';
        await eventBus.subscribeBatch(
            KAFKA_TOPICS.PROJECT_TEAM_MEMBER,
            GROUP_ID,
            async (events: any[]) => {
                const deletedEvents = events.filter(e => e.type === KAFKA_EVENTS.PROJECT_TEAM_MEMBER.DELETED);
                
                await withBatchIdempotency(deletedEvents, GROUP_ID, async (unprocessed) => {
                    for (const event of unprocessed) {
                        const { projectId, teamId, userId } = event.data;
                        console.log(`[Task Service] Unassigning user ${userId} from tasks in team ${teamId} for project ${projectId}`);
                        await unassignMemberFromTeamTasks(projectId, teamId, userId);
                    }
                });
            }
        );
        
        console.log('[Task Service] ProjectTeamMemberDeletedListener started');
    }

    async stop() {}
}

export const projectTeamMemberDeletedListener = new ProjectTeamMemberDeletedListener();
