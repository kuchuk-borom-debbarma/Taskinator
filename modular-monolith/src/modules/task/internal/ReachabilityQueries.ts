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

export interface TaskDirectLinkDelta {
    taskId: string;
    incomingDelta: number;
    outgoingDelta: number;
}

/**
 * Maximum Atomic Reachability Engine.
 *
 * Performs matrix expansion, orphaned path cleanup, transitive count repair,
 * and next-step outbox signaling in a single atomic database transaction.
 */
export const expandReachabilityFrontierBatch = async (
    steps: ReachabilityExpansionStep[],
    trx?: any,
): Promise<ReachabilityExpansionResult[]> => {
    if (steps.length === 0) return [];

    const dbHandle = trx || db;

    const projectIds = steps.map((s) => s.projectId);
    const ancestorIds = steps.map((s) => s.ancestorId);
    const frontierIds = steps.map((s) => s.frontierId);
    const actions = steps.map((s) => s.action);
    const depths = steps.map((s) => s.depth);

    const result = await sql<ReachabilityExpansionResult>`
        WITH input_data AS (
            SELECT 
                unnest(${projectIds}::uuid[]) as pid,
                unnest(${ancestorIds}::uuid[]) as aid,
                unnest(${frontierIds}::uuid[]) as fid,
                unnest(${actions}::text[]) as act,
                unnest(${depths}::integer[]) as d
        ),
        expanded_inputs AS (
            -- Step 1 Frontier: If depth=1, join with ancestors. Else use provided ancestor.
            SELECT i.pid, tr.ancestor_task_id as aid, i.fid, i.act, i.d
            FROM input_data i
            JOIN task_reachability tr ON tr.descendant_task_id = i.aid AND tr.fk_project_id = i.pid
            WHERE i.d = 1
            UNION ALL
            SELECT pid, aid, fid, act, d FROM input_data WHERE d = 1
            UNION ALL
            SELECT pid, aid, fid, act, d FROM input_data WHERE d > 1
        ),
        matrix_update AS (
            -- Perform additions/updates
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
        matrix_removals AS (
            -- Perform removals
            UPDATE task_reachability
            SET path_count = task_reachability.path_count - 1
            FROM expanded_inputs ei
            WHERE ei.act = 'REMOVE'
              AND task_reachability.fk_project_id = ei.pid
              AND task_reachability.ancestor_task_id = ei.aid
              AND task_reachability.descendant_task_id = ei.fid
            RETURNING task_reachability.fk_project_id as pid, task_reachability.ancestor_task_id as aid, task_reachability.descendant_task_id as fid
        ),
        cleanup AS (
            -- Delete records where path count reaches zero
            DELETE FROM task_reachability
            WHERE fk_project_id IN (SELECT pid FROM expanded_inputs)
              AND path_count <= 0
        ),
        affected_nodes AS (
            -- Collect all nodes that need count sync in this batch
            SELECT pid, aid as tid FROM expanded_inputs
            UNION
            SELECT pid, fid as tid FROM expanded_inputs
        ),
        sync_totals AS (
            -- Atomic count repair for impacted tasks
            UPDATE project_task
            SET 
                total_incoming_count = (SELECT count(*) FROM task_reachability WHERE descendant_task_id = project_task.id),
                total_outgoing_count = (SELECT count(*) FROM task_reachability WHERE ancestor_task_id = project_task.id),
                updated_at = NOW()
            FROM affected_nodes an
            WHERE project_task.id = an.tid AND project_task.fk_project_id = an.pid
        ),
        next_frontier AS (
            -- Discover neighbors for the next recursive step
            SELECT 
                ei.pid as "projectId",
                ei.aid as "ancestorId",
                tl.target_task_id as "neighborId",
                ei.act as "action",
                (ei.d + 1) as "depth"
            FROM expanded_inputs ei
            JOIN task_link tl ON tl.source_task_id = ei.fid AND tl.fk_project_id = ei.pid
            WHERE (ei.act = 'ADD') OR (EXISTS (SELECT 1 FROM matrix_removals r WHERE r.pid = ei.pid AND r.aid = ei.aid AND r.fid = ei.fid))
            GROUP BY ei.pid, ei.aid, tl.target_task_id, ei.act, ei.d
        ),
        outbox_signal AS (
            -- Transactional Outbox Insertion for recursion
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'task-aggregated-events',
                "projectId"::text,
                jsonb_build_object(
                    'type', 'task.aggregated.reachability_expand',
                    'steps', jsonb_agg(
                        jsonb_build_object(
                            'projectId', "projectId",
                            'ancestorId', "ancestorId",
                            'frontierId', "neighborId",
                            'action', "action",
                            'depth', "depth"
                        )
                    )
                )
            FROM next_frontier
            GROUP BY "projectId"
        )
        SELECT * FROM next_frontier
    `.execute(dbHandle);

    return result.rows;
};
