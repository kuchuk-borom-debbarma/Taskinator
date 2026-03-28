import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllProjectMembers } from '../ProjectQueries';
import { eventBus } from '../../../../utils/EventBus';

export class MemberCleanupListener {
    async init() {
        await eventBus.on(KAFKA_TOPICS.PROJECT, 'member-cleanup-group', {
            [KAFKA_EVENTS.PROJECT.DELETED]: async (data) => {
                const { projectId } = data;
                console.log(`[Project Service] Cleaning up members for project: ${projectId}`);
                await deleteAllProjectMembers(projectId);
            }
        });
        console.log('[Project Service] MemberCleanupListener started');
    }

    async stop() {}
}

export const memberCleanupListener = new MemberCleanupListener();
