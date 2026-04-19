import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus';

export class ProjectMemberDeletedListener {
    async init() {
        await eventBus.subscribe('team-member-cleanup-group', {
            [KAFKA_EVENTS.PROJECT_MEMBER.DELETED]: async (data) => {
                const { projectId, userId } = data;
                console.log(
                    `[Team Service] Removing user ${userId} from all teams in project ${projectId}`,
                );
            },
        });
        console.log('[Team Service] ProjectMemberDeletedListener started');
    }

    async stop() {}
}

export const projectMemberDeletedListener = new ProjectMemberDeletedListener();
