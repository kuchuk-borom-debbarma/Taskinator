import { KAFKA_EVENTS, eventBus } from '../../../../utils/EventBus';
import { deleteAllProjectMembers } from '../ProjectQueries';

export class MemberCleanupListener {
    async init() {
        await eventBus.subscribe('member-cleanup-group', {
            [KAFKA_EVENTS.PROJECT.DELETED]: async (data) => {
                const { projectId } = data;
                console.log(
                    `[Project Service] Cleaning up members for project: ${projectId}`,
                );
                await deleteAllProjectMembers(projectId);
            },
        });
        console.log('[Project Service] MemberCleanupListener started');
    }

    async stop() {}
}

export const memberCleanupListener = new MemberCleanupListener();
