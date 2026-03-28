import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllProjectTeams } from '../TeamQueries';
import { eventBus } from '../../../../utils/EventBus';

export class TeamCleanupListener {
    async init() {
        await eventBus.on(KAFKA_TOPICS.PROJECT, 'team-cleanup-group', {
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
