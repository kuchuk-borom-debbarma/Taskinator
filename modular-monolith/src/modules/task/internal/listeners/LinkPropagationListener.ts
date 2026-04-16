import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus.ts';
import { rebuildProjectPathsQuery } from '../TaskQueries.ts';

export class LinkPropagationListener {
    async init() {
        await eventBus.subscribe('task-relationship-propagation-group', {
            // Initial Trigger: Link Created
            [KAFKA_EVENTS.TASK_LINK.CREATED]: async (data: {
                projectId: string;
                sourceTaskId: string;
                targetTaskId: string;
            }) => {
                const { projectId } = data;
                console.log(
                    `[LinkPropagator] Link created, rebuilding project graph paths: ${projectId}`,
                );

                await rebuildProjectPathsQuery({ projectId });
            },

            // Initial Trigger: Link Deleted
            [KAFKA_EVENTS.TASK_LINK.DELETED]: async (data: {
                projectId: string;
            }) => {
                const { projectId } = data;
                console.log(
                    `[LinkPropagator] Link deleted, rebuilding project graph paths: ${projectId}`,
                );

                await rebuildProjectPathsQuery({ projectId });
            },

            // Iterative Loop: Propagate through descendants in batches
            [KAFKA_EVENTS.TASK_LINK.PROPAGATE]: async (data: {
                projectId: string;
                taskId: string;
                offset: number;
            }) => {
                await rebuildProjectPathsQuery({ projectId: data.projectId });
            },
        });

        console.log('[Task Service] LinkPropagationListener started');
    }

    async stop() {}
}

export const linkPropagationListener = new LinkPropagationListener();
