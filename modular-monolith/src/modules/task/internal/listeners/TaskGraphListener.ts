import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus.ts';
    import { decrementLinkReachability } from '../TaskQueries.ts';
    import { logger } from '../../../../logger';

    export class TaskGraphListener {
        private groupId = 'task-graph-cleanup-group';

        async init() {
            logger.info(`[Task Service] Starting TaskGraphListener with group: ${this.groupId}`);
            
            await eventBus.subscribe(this.groupId, {
                // Handle link deletion by decrementing transitive reachability
                [KAFKA_EVENTS.PROJECT_TASK_LINK.DELETED]: async (data: any) => {
                    const { projectId, sourceTaskId, targetTaskId, linkId } = data;
                    
                    logger.debug(
                        `[Task Service] Cleaning up reachability for deleted link: ${linkId} (${sourceTaskId} -> ${targetTaskId})`
                    );

                    try {
                        await decrementLinkReachability({
                            projectId,
                            sourceTaskId,
                            targetTaskId,
                        });
                    } catch (error) {
                        logger.error(
                            `[Task Service] Failed to cleanup reachability for link ${linkId}:`,
                            error
                        );
                        throw error; // Kafka will retry based on its configuration
                    }
                },

                // Task deleted event: 
                // Note: The deleteTaskQuery already emits individual LINK.DELETED events 
                // for every link the task had. Those events will hit the handler above.
                // The task deletion itself might require additional cleanup if we had 
                // other metadata, but for graph reachability, the link-level cleanup is sufficient.
                [KAFKA_EVENTS.PROJECT_TASK.DELETED]: async (data: any) => {
                    const { taskId, projectId } = data;
                    logger.debug(`[Task Service] Task deletion event received for ${taskId} in project ${projectId}`);
                }
            });
        }

        async stop() {
            logger.info(`[Task Service] Stopping TaskGraphListener`);
        }
    }

    export const taskGraphListener = new TaskGraphListener();
