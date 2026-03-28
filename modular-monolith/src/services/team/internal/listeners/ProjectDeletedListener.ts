import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllProjectTeams } from '../TeamQueries';
import { eventBus } from '../../../../utils/EventBus';

export class TeamCleanupListener {
    async init() {
        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT,
            'team-cleanup-group',
            async (event: any) => {
                if (event.type === KAFKA_EVENTS.PROJECT.DELETED) {
                    const { projectId } = event.data;
                    console.log(`[Team Service] Cleaning up teams for project: ${projectId}`);
                    await deleteAllProjectTeams(projectId);
                }
            }
        );
        
        console.log('[Team Service] TeamCleanupListener started');
    }

    async stop() {}
}

export const teamCleanupListener = new TeamCleanupListener();
