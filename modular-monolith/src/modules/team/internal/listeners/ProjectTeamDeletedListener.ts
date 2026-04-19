import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus';

export class ProjectTeamDeletedListener {
    async init() {
        await eventBus.subscribe('team-member-cleanup-group', {
            [KAFKA_EVENTS.PROJECT_TEAM.DELETED]: async (data) => {
                const { projectId, teamId } = data;
                console.log(
                    `[Team Service] Deleting members for team ${teamId} in project ${projectId}`,
                );
            },
        });
        console.log('[Team Service] ProjectTeamDeletedListener started');
    }

    async stop() {}
}

export const projectTeamDeletedListener = new ProjectTeamDeletedListener();
