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
): Promise<string[]> => {
    switch (action.target) {
        case '@self':
            // No query needed — the trigger task IS the target.
            return [triggerTaskId];

        case '@parent': {
            const result = await sql<{ parent: string | null }>`
                SELECT fk_parent_task_id AS parent
                FROM project_task
                WHERE id = ${triggerTaskId}::uuid
                  AND fk_project_id = ${projectId}::uuid
            `.execute(db);
            const parent = result.rows[0]?.parent;
            return parent ? [parent] : []; // Tasks without a parent are silently skipped
        }

        case '@children': {
            const result = await sql<{ id: string }>`
                SELECT id
                FROM project_task
                WHERE fk_parent_task_id = ${triggerTaskId}::uuid
                  AND fk_project_id = ${projectId}::uuid
            `.execute(db);
            return result.rows.map((r) => r.id);
        }

        case '@descendants': {
            // Fetch the trigger task's own materialized_path first to build
            // the ancestor prefix that all descendants will share in their path.
            const taskRow = await sql<{ path: string }>`
                SELECT materialized_path AS path
                FROM project_task
                WHERE id = ${triggerTaskId}::uuid
                  AND fk_project_id = ${projectId}::uuid
            `.execute(db);

            const ownPath = taskRow.rows[0]?.path;
            if (ownPath === undefined) return [];

            // Ancestor prefix = parent's path + '/' + trigger task's own id
            // All descendants will have their materialized_path starting with this prefix.
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
            return result.rows.map((r) => r.id);
        }

        case 'SPECIFIC_TASKS':
            // IDs already baked into the rule by the user — no query needed.
            return action.targetIds ?? [];

        default:
            return [];
    }
};
