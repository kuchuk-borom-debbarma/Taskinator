import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus';
import { deleteAllProjectTeams } from '../TeamQueries';

export class TeamCleanupListener {
    async init() {
        await eventBus.subscribe('team-cleanup-group', {
            [KAFKA_EVENTS.PROJECT.DELETED]: async (data) => {
                const { projectId } = data;
                console.log(
                    `[Team Service] Cleaning up teams for project: ${projectId}`,
                );
                await deleteAllProjectTeams(projectId);
            },
        });
        console.log('[Team Service] TeamCleanupListener started');
    }

    async stop() {}
}

export const teamCleanupListener = new TeamCleanupListener();
