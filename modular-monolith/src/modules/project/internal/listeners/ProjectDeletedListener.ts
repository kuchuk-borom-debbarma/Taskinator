import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus';

export class MemberCleanupListener {
    async init() {
        await eventBus.subscribe('member-cleanup-group', {
            [KAFKA_EVENTS.PROJECT.DELETED]: async (data) => {
                const { projectId } = data;
                console.log(
                    `[Project Service] Cleaning up members for project: ${projectId}`,
                );
            },
        });
        console.log('[Project Service] MemberCleanupListener started');
    }

    async stop() {}
}

export const memberCleanupListener = new MemberCleanupListener();
