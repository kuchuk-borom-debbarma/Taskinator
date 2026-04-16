import type { Action } from './DSL.ts';

/**
 * Resolves a TargetDirection into a concrete list of Entity IDs.
 */
export const resolveTarget = async (
    projectId: string,
    action: Action,
    cache?: Map<string, string[]>,
): Promise<string[]> => {
    const cacheKey = `${action.target}`;
    if (cache && cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
    }

    let resultIds: string[] = [];

    switch (action.target) {
        case '@self':
            // Logic for resolving @self into the triggering entity ID
            // For now, we return empty as Task is gone
            resultIds = [];
            break;

        default:
            resultIds = [];
    }

    if (cache) {
        cache.set(cacheKey, resultIds);
    }

    return resultIds;
};
