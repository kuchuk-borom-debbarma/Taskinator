import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllProjectTeams } from '../TeamQueries';
import { eventBus } from '../../../../utils/EventBus';
import { withIdempotency } from '../../../../utils/idempotency';

export class TeamCleanupListener {
    async init() {
        const GROUP_ID = 'team-cleanup-group';
        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT,
            GROUP_ID,
            async (event: any) => {
                if (event.type === KAFKA_EVENTS.PROJECT.DELETED) {
                    await withIdempotency(event.eventId, GROUP_ID, async () => {
                        const { projectId } = event.data;
                        console.log(`[Team Service] Cleaning up teams for project: ${projectId}`);
                        await deleteAllProjectTeams(projectId);
                    });
                }
            }
        );
        
        console.log('[Team Service] TeamCleanupListener started');
    }

    async stop() {}
}

export const teamCleanupListener = new TeamCleanupListener();
