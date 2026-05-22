import DataLoader from 'dataloader';
import type { AutoAction } from '../../database/tables/AutoAction.ts';
import { autoActionService } from '../../modules/auto-action';

export const byId = () =>
    new DataLoader<string, AutoAction | null>(
        async (ids) => {
            const autoActions = await autoActionService.getAutoActionsByIds([
                ...ids,
            ]);
            const autoActionMap = new Map(
                autoActions.map((autoAction) => [autoAction.id, autoAction]),
            );
            return ids.map((id) => autoActionMap.get(id) || null);
        },
        { cache: true },
    );

export const byActorIdAndId = () =>
    new DataLoader<{ actorId: string; id: string }, AutoAction | null, string>(
        async (keys) => {
            const actorToAutoActionIds = new Map<string, string[]>();
            keys.forEach((key) => {
                const ids = actorToAutoActionIds.get(key.actorId) || [];
                ids.push(key.id);
                actorToAutoActionIds.set(key.actorId, ids);
            });

            const resultMap = new Map<string, AutoAction>();
            await Promise.all(
                Array.from(actorToAutoActionIds.entries()).map(
                    async ([actorId, ids]) => {
                        const autoActions =
                            await autoActionService.getAutoActionsForActorByIds(
                                actorId,
                                ids,
                            );
                        autoActions.forEach((autoAction) => {
                            resultMap.set(
                                `${actorId}:${autoAction.id}`,
                                autoAction,
                            );
                        });
                    },
                ),
            );

            return keys.map(
                (key) => resultMap.get(`${key.actorId}:${key.id}`) || null,
            );
        },
        {
            cache: true,
            cacheKeyFn: (key) => `${key.actorId}:${key.id}`,
        },
    );
