import { sql } from 'kysely';
import { db } from '../../../../database/index.ts';
import type { TargetDirection, Action } from './DSL.ts';

/**
 * Resolves a TargetDirection into a concrete list of task IDs.
 *
 * Targets that are already deterministic (@self, SPECIFIC_TASKS) require
 * no DB queries. Relational targets (@parent, @children, @descendants)
 * issue a single indexed query each.
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

        case '@parent': {
            const result = await sql<{ parent: string | null }>`
                SELECT fk_parent_task_id AS parent
                FROM project_task
                WHERE id = ${triggerTaskId}::uuid
                  AND fk_project_id = ${projectId}::uuid
            `.execute(db);
            const parent = result.rows[0]?.parent;
            resultIds = parent ? [parent] : [];
            break;
        }

        case '@children': {
            const result = await sql<{ id: string }>`
                SELECT id
                FROM project_task
                WHERE fk_parent_task_id = ${triggerTaskId}::uuid
                  AND fk_project_id = ${projectId}::uuid
            `.execute(db);
            resultIds = result.rows.map((r) => r.id);
            break;
        }

        case '@descendants': {
            const taskRow = await sql<{ path: string }>`
                SELECT materialized_path AS path
                FROM project_task
                WHERE id = ${triggerTaskId}::uuid
                  AND fk_project_id = ${projectId}::uuid
            `.execute(db);

            const ownPath = taskRow.rows[0]?.path;
            if (ownPath === undefined) {
                resultIds = [];
            } else {
                const prefix = ownPath === '' ? triggerTaskId : `${ownPath}/${triggerTaskId}`;

                const result = await sql<{ id: string }>`
                    SELECT id
                    FROM project_task
                    WHERE fk_project_id = ${projectId}::uuid
                      AND (
                          materialized_path = ${prefix}
                          OR materialized_path LIKE ${prefix + '/%'}
                      )
                `.execute(db);
                resultIds = result.rows.map((r) => r.id);
            }
            break;
        }

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
