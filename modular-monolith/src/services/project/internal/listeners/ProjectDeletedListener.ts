import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllProjectMembers } from '../ProjectQueries';
import { eventBus } from '../../../../utils/EventBus';

export class MemberCleanupListener {
    async init() {
        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT,
            'member-cleanup-group',
            async (event: any) => {
                if (event.type === KAFKA_EVENTS.PROJECT.DELETED) {
                    const { projectId } = event.data;
                    console.log(`[Project Service] Cleaning up members for project: ${projectId}`);
                    await deleteAllProjectMembers(projectId);
                }
            }
        );
        
        console.log('[Project Service] MemberCleanupListener started');
    }

    async stop() {}
}

export const memberCleanupListener = new MemberCleanupListener();
