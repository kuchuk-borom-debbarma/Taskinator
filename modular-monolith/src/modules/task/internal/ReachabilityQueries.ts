import { sql } from 'kysely';
import { db } from '../../../database';

export interface ReachabilityExpansionStep {
    projectId: string;
    ancestorId: string;
    frontierId: string;
    action: 'ADD' | 'REMOVE';
    depth: number;
}

export interface ReachabilityExpansionResult {
    projectId: string;
    ancestorId: string;
    neighborId: string;
    action: 'ADD' | 'REMOVE';
    depth: number;
}

/**
 * High-performance batch frontier expansion for Task Reachability.
 * Updates path counts for the current step and returns the next set of nodes to visit.
 */
export const expandReachabilityFrontierBatch = async (
    steps: ReachabilityExpansionStep[],
): Promise<ReachabilityExpansionResult[]> => {
    if (steps.length === 0) return [];

    const projectIds = steps.map((s) => s.projectId);
    const ancestorIds = steps.map((s) => s.ancestorId);
    const frontierIds = steps.map((s) => s.frontierId);
    const actions = steps.map((s) => s.action);
    const depths = steps.map((s) => s.depth);

    // SQL block to update path counts and find next neighbors in one trip
    const result = await sql<ReachabilityExpansionResult>`
        WITH input_data AS (
            SELECT 
                unnest(${projectIds}::uuid[]) as pid,
                unnest(${ancestorIds}::uuid[]) as aid, -- This is the sourceTaskId in Step 1
                unnest(${frontierIds}::uuid[]) as fid,
                unnest(${actions}::text[]) as act,
                unnest(${depths}::integer[]) as d
        ),
        expanded_inputs AS (
            -- Case A: Step 1 Initial triggers - Find all ancestors of the source node
            SELECT i.pid, tr.ancestor_task_id as aid, i.fid, i.act, i.d
            FROM input_data i
            JOIN task_reachability tr ON tr.descendant_task_id = i.aid AND tr.fk_project_id = i.pid
            WHERE i.d = 1
            
            UNION ALL
            
            -- Case B: Step 1 Initial triggers - Include the source node itself
            SELECT pid, aid, fid, act, d
            FROM input_data
            WHERE d = 1
            
            UNION ALL
            
            -- Case C: Step N Recursive Hops - Ancestor is already fully expanded
            SELECT pid, aid, fid, act, d
            FROM input_data
            WHERE d > 1
        ),
        updates AS (
            -- Step 1: Perform the Matrix Update for the current frontier
            INSERT INTO task_reachability (fk_project_id, ancestor_task_id, descendant_task_id, path_count, min_depth)
            SELECT pid, aid, fid, 1, d
            FROM expanded_inputs
            WHERE act = 'ADD'
            ON CONFLICT (fk_project_id, ancestor_task_id, descendant_task_id)
            DO UPDATE SET 
                path_count = task_reachability.path_count + 1,
                min_depth = LEAST(task_reachability.min_depth, EXCLUDED.min_depth)
            RETURNING fk_project_id as pid, ancestor_task_id as aid, descendant_task_id as fid
        ),
        removals AS (
            -- Step 2: Handle removals (decrement path counts)
            UPDATE task_reachability
            SET path_count = task_reachability.path_count - 1
            FROM expanded_inputs ei
            WHERE ei.act = 'REMOVE'
              AND task_reachability.fk_project_id = ei.pid
              AND task_reachability.ancestor_task_id = ei.aid
              AND task_reachability.descendant_task_id = ei.fid
            RETURNING task_reachability.fk_project_id as pid, task_reachability.ancestor_task_id as aid, task_reachability.descendant_task_id as fid
        ),
        next_frontier AS (
            -- Step 3: Discover neighbors for the NEXT step of recursion
            -- We group by ancestor + neighbor to avoid event explosion
            SELECT 
                ei.pid as "projectId",
                ei.aid as "ancestorId",
                tl.target_task_id as "neighborId",
                ei.act as "action",
                (ei.d + 1) as "depth"
            FROM expanded_inputs ei
            JOIN task_link tl ON tl.source_task_id = ei.fid AND tl.fk_project_id = ei.pid
            -- Cleanup logic: If it was a removal, we only continue if the path actually existed
            WHERE (ei.act = 'ADD') OR (EXISTS (SELECT 1 FROM removals r WHERE r.pid = ei.pid AND r.aid = ei.aid AND r.fid = ei.fid))
            GROUP BY ei.pid, ei.aid, tl.target_task_id, ei.act, ei.d
        )
        SELECT * FROM next_frontier
    `.execute(db);

    return result.rows;
};

/**
 * Clears orphaned reachability paths (where count <= 0).
 */
export const cleanupOrphanedReachability = async () => {
    await sql`DELETE FROM task_reachability WHERE path_count <= 0`.execute(db);
};

/**
 * Synchronizes the total Transitive Counts (incoming/outgoing) for affected tasks.
 */
export const syncTaskTransitiveCounts = async (taskIds: string[]) => {
    if (taskIds.length === 0) return;

    await sql`
        UPDATE project_task
        SET 
            total_incoming_count = (SELECT count(*) FROM task_reachability WHERE descendant_task_id = project_task.id),
            total_outgoing_count = (SELECT count(*) FROM task_reachability WHERE ancestor_task_id = project_task.id),
            updated_at = NOW()
        WHERE id = ANY(${taskIds}::uuid[])
    `.execute(db);
};
