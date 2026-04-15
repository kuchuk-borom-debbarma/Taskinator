import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus.ts';
import { rebuildTerminalPathsQuery, getDownstreamTaskIdsQuery } from '../TaskQueries.ts';

export class LinkPropagationListener {
    async init() {
        await eventBus.subscribe('task-relationship-propagation-group', {
            // Initial Trigger: Link Created
            [KAFKA_EVENTS.TASK_LINK.CREATED]: async (data: {
                projectId: string;
                fromTaskId: string;
                toTaskId: string;
            }) => {
                const { projectId, toTaskId } = data;
                console.log(`[LinkPropagator] Link created, starting propagation from terminal: ${toTaskId}`);
                
                // 1. Re-bake paths for the immediate terminal
                await rebuildTerminalPathsQuery({ projectId, terminalId: toTaskId });

                // 2. Trigger propagation to descendants
                await eventBus.publish(KAFKA_EVENTS.TASK_LINK.PROPAGATE, {
                    key: projectId,
                    data: { projectId, taskId: toTaskId, offset: 0 }
                });
            },

            // Initial Trigger: Link Deleted
            [KAFKA_EVENTS.TASK_LINK.DELETED]: async (data: {
                projectId: string;
                toTaskId: string;
            }) => {
                const { projectId, toTaskId } = data;
                console.log(`[LinkPropagator] Link deleted, re-baking sub-tree from terminal: ${toTaskId}`);
                
                // 1. Re-bake paths for the immediate terminal
                await rebuildTerminalPathsQuery({ projectId, terminalId: toTaskId });

                // 2. Trigger propagation to descendants
                await eventBus.publish(KAFKA_EVENTS.TASK_LINK.PROPAGATE, {
                    key: projectId,
                    data: { projectId, taskId: toTaskId, offset: 0 }
                });
            },

            // Iterative Loop: Propagate through descendants in batches
            [KAFKA_EVENTS.TASK_LINK.PROPAGATE]: async (data: {
                projectId: string;
                taskId: string;
                offset: number;
            }) => {
                const { projectId, taskId, offset } = data;
                const BATCH_SIZE = 50;

                console.log(`[LinkPropagator] Propagating for descendants of ${taskId} (Offset: ${offset})`);

                // 1. Find the next batch of direct children
                const downstreamIds = await getDownstreamTaskIdsQuery({
                    projectId,
                    taskId,
                    limit: BATCH_SIZE,
                    offset
                });

                if (downstreamIds.length === 0) {
                    console.log(`[LinkPropagator] Finished propagation chain for task ${taskId}`);
                    return;
                }

                // 2. Re-bake paths for each child in the batch
                // We do this sequentially to avoid overwhelming the DB
                for (const childId of downstreamIds) {
                    await rebuildTerminalPathsQuery({ projectId, terminalId: childId });
                    
                    // Trigger propagation for this child's children
                    await eventBus.publish(KAFKA_EVENTS.TASK_LINK.PROPAGATE, {
                        key: projectId,
                        data: { projectId, taskId: childId, offset: 0 }
                    });
                }

                // 3. If there are more direct children, re-emit for the next batch
                if (downstreamIds.length === BATCH_SIZE) {
                    await eventBus.publish(KAFKA_EVENTS.TASK_LINK.PROPAGATE, {
                        key: projectId,
                        data: { projectId, taskId, offset: offset + BATCH_SIZE }
                    });
                }
            }
        });

        console.log('[Task Service] LinkPropagationListener started');
    }

    async stop() {}
}

export const linkPropagationListener = new LinkPropagationListener();
