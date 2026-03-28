import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllTeamMembers } from '../TeamQueries';
import { eventBus } from '../../../../utils/EventBus';
import { withIdempotency } from '../../../../utils/idempotency';

export class ProjectTeamDeletedListener {
    async init() {
        const GROUP_ID = 'team-member-cleanup-group';
        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_TEAM,
            GROUP_ID,
            async (event: any) => {
                if (event.type === KAFKA_EVENTS.PROJECT_TEAM.DELETED) {
                    await withIdempotency(event.eventId, GROUP_ID, async () => {
                        const { projectId, teamId } = event.data;
                        console.log(`[Team Service] Deleting members for team ${teamId} in project ${projectId}`);
                        await deleteAllTeamMembers(projectId, teamId);
                    });
                }
            }
        );
        
        console.log('[Team Service] ProjectTeamDeletedListener started');
    }

    async stop() {}
}

export const projectTeamDeletedListener = new ProjectTeamDeletedListener();
