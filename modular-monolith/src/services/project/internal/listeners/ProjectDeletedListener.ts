import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../../utils/kafka';
import { deleteAllProjectMembers } from '../ProjectQueries';
import { eventBus } from '../../../../utils/EventBus';
import { withIdempotency } from '../../../../utils/idempotency';

export class MemberCleanupListener {
    async init() {
        const GROUP_ID = 'member-cleanup-group';
        await eventBus.subscribe(
            KAFKA_TOPICS.PROJECT,
            GROUP_ID,
            async (event: any) => {
                if (event.type === KAFKA_EVENTS.PROJECT.DELETED) {
                    await withIdempotency(event.eventId, GROUP_ID, async () => {
                        const { projectId } = event.data;
                        console.log(`[Project Service] Cleaning up members for project: ${projectId}`);
                        await deleteAllProjectMembers(projectId);
                    });
                }
            }
        );
        
        console.log('[Project Service] MemberCleanupListener started');
    }

    async stop() {}
}

export const memberCleanupListener = new MemberCleanupListener();
