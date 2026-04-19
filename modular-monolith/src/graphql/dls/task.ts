import DataLoader from 'dataloader';
import { taskService, type Task } from '../../modules/task';

/**
 * Factory for creating a DataLoader that fetches Tasks by their unique ID.
 * Key: { actorId: string; taskId: string }
 * Return: Task | null
 */
export const byId = () =>
    new DataLoader<{ actorId: string; taskId: string }, Task | null, string>(
        async (keys) => {
            const actorToTaskIds = new Map<string, string[]>();
            keys.forEach(k => {
                const ids = actorToTaskIds.get(k.actorId) || [];
                ids.push(k.taskId);
                actorToTaskIds.set(k.actorId, ids);
            });

            const resultMap = new Map<string, Task>();

            await Promise.all(
                Array.from(actorToTaskIds.entries()).map(async ([actorId, taskIds]) => {
                    const tasks = await taskService.getTasksByIds(actorId, taskIds);
                    tasks.forEach(t => {
                        resultMap.set(`${actorId}:${t.id}`, t);
                    });
                })
            );

            return keys.map(k => resultMap.get(`${k.actorId}:${k.taskId}`) || null);
        },
        { 
            cache: true,
            cacheKeyFn: (key) => `${key.actorId}:${key.taskId}`
        }
    );
