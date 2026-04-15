import { sql } from 'kysely';
import { db } from '../../../../database/index.ts';
import type { TargetDirection, Action } from './DSL.ts';

/**
 * Resolves a TargetDirection into a concrete list of task IDs.
 *
 * Targets that are already deterministic (@self, SPECIFIC_TASKS) require
 * no DB queries.
 */
export const resolveTarget = async (
    triggerTaskId: string,
    projectId: string,
    action: Action,
    cache?: Map<string, string[]>,
): Promise<string[]> => {
    // 0. Check cache first for relational targets
    const cacheKey = `${action.target}`;
    if (cache && cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
    }

    let resultIds: string[] = [];

    switch (action.target) {
        case '@self':
            resultIds = [triggerTaskId];
            break;

        case 'SPECIFIC_TASKS':
            resultIds = action.targetIds ?? [];
            break;

        default:
            resultIds = [];
    }

    if (cache) {
        cache.set(cacheKey, resultIds);
    }

    return resultIds;
};
