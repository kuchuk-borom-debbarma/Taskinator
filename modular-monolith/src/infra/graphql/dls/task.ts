import DataLoader from 'dataloader';
import { type Task, taskService } from '../../../modules/task';

/**
 * Standard DataLoader for fetching Tasks by ID.
 * Use this for internal lookups where authorization is already established.
 */
export const byId = () =>
    new DataLoader<string, Task | null>(
        async (ids) => {
            const tasks = await taskService.getTasksByIds([...ids]);
            const taskMap = new Map(tasks.map((t) => [t.id, t]));
            return ids.map((id) => taskMap.get(id) || null);
        },
        { cache: true },
    );

/**
 * Authorization-aware DataLoader.
 * Ensures the actorId has permission to view the tasks.
 */
export const byActorIdAndId = () =>
    new DataLoader<{ actorId: string; id: string }, Task | null, string>(
        async (keys) => {
            const actorToTaskIds = new Map<string, string[]>();
            keys.forEach((k) => {
                const ids = actorToTaskIds.get(k.actorId) || [];
                ids.push(k.id);
                actorToTaskIds.set(k.actorId, ids);
            });

            const resultMap = new Map<string, Task>();

            await Promise.all(
                Array.from(actorToTaskIds.entries()).map(
                    async ([actorId, taskIds]) => {
                        const tasks = await taskService.getTasksByActorIdAndIds(
                            actorId,
                            taskIds,
                        );
                        tasks.forEach((t) => {
                            resultMap.set(`${actorId}:${t.id}`, t);
                        });
                    },
                ),
            );

            return keys.map(
                (k) => resultMap.get(`${k.actorId}:${k.id}`) || null,
            );
        },
        {
            cache: true,
            cacheKeyFn: (key) => `${key.actorId}:${key.id}`,
        },
    );
