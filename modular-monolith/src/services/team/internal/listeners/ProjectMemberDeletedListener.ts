import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { removeUserFromAllTeams } from '../TeamQueries';
import { eventBus } from '../../../../utils/EventBus';
import { withIdempotency } from '../../../../utils/idempotency';

export class ProjectMemberDeletedListener {
    async init() {
        const GROUP_ID = 'team-member-cleanup-group';
        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT_MEMBER,
            GROUP_ID,
            async (event: any) => {
                if (event.type === KAFKA_EVENTS.PROJECT_MEMBER.DELETED) {
                    await withIdempotency(event.eventId, GROUP_ID, async () => {
                        const { projectId, userId } = event.data;
                        console.log(`[Team Service] Removing user ${userId} from all teams in project ${projectId}`);
                        await removeUserFromAllTeams(projectId, userId);
                    });
                }
            }
        );
        
        console.log('[Team Service] ProjectMemberDeletedListener started');
    }

    async stop() {}
}

export const projectMemberDeletedListener = new ProjectMemberDeletedListener();
