import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus.ts';
import { deleteChildrenTasksBatch } from '../TaskQueries.ts';
import type { ProjectTask } from '../../TaskService.ts';

export class TaskDeleteListener {
    async init() {
        await eventBus.subscribe('task-recursive-cleanup-group', {
            [KAFKA_EVENTS.PROJECT_TASK.PARENT_DELETED]: async (data: ProjectTask) => {
                const { projectId, id, materializedPath } = data;
                
                // Construct path for children search
                const parentPath = materializedPath ? `${materializedPath}/${id}` : id;
                
                console.log(
                    `[Task Service] Recursively cleaning up children for task: ${id}, projectId: ${projectId}, parentPath: ${parentPath}, rawMaterializedPath: '${materializedPath}'`,
                );
                
                // Delete up to 100 children at a time
                const { deletedIds, hasMore } = await deleteChildrenTasksBatch(
                    projectId,
                    parentPath,
                    100
                );
                
                // If we deleted children, let the trigger service know
                if (deletedIds.length > 0) {
                    await eventBus.publish(KAFKA_EVENTS.PROJECT_TASK.CHILDREN_DELETED, {
                        key: id, // parent id as key
                        data: {
                            projectId,
                            parentTaskId: id,
                            childTaskIds: deletedIds
                        }
                    });
                }
                
                // If more children exist, re-emit PARENT_DELETED to keep the loop going
                if (hasMore) {
                    await eventBus.publish(KAFKA_EVENTS.PROJECT_TASK.PARENT_DELETED, {
                        key: id,
                        data
                    });
                } else {
                    console.log(`[Task Service] Child deletion loop completed for task: ${id}`);
                }
            },
        });
        console.log('[Task Service] TaskDeleteListener started');
    }

    async stop() {}
}

export const taskDeleteListener = new TaskDeleteListener();
