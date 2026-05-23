import { sql } from 'kysely';
import { db } from '../../../database/index.js';

/**
 * Efficiency-optimized DB checks for guards.
 * These queries use indexes on task_reachability and task_link for O(log N) performance.
 */

/**
 * Checks if there are any active subtasks (not in 'DONE' status) for a given parent task.
 * Uses task_reachability to find all descendants at any depth > 0.
 */
export async function checkActiveSubtasks(taskId: string): Promise<boolean> {
    const result = await sql<{ exists: boolean }>`
        SELECT EXISTS (
            SELECT 1 
            FROM task_reachability tr
            JOIN project_task pt ON pt.id = tr.descendant_task_id
            WHERE tr.ancestor_task_id = ${taskId}::uuid
              AND tr.depth > 0
              AND pt.status != 'DONE'
        ) as "exists"
    `.execute(db);
    return result.rows[0]?.exists ?? false;
}

/**
 * Checks if there are any incomplete blockers (not in 'DONE' status) for a given target task.
 * A task is blocked if it has a 'blocks' link where the source task is not 'DONE'.
 */
export async function checkIncompleteBlockers(
    taskId: string,
): Promise<boolean> {
    const result = await sql<{ exists: boolean }>`
        SELECT EXISTS (
            SELECT 1 
            FROM task_link tl
            JOIN project_task pt ON pt.id = tl.source_task_id
            WHERE tl.target_task_id = ${taskId}::uuid
              AND tl.label = 'blocks'
              AND pt.status != 'DONE'
        ) as "exists"
    `.execute(db);
    return result.rows[0]?.exists ?? false;
}

/**
 * Checks if a task has no team assigned.
 * Used by MEMBER_ASSIGNMENT_GUARD to prevent individual assignment without a team context.
 */
export async function checkTeamAssignment(taskId: string): Promise<boolean> {
    const result = await sql<{ is_null: boolean }>`
        SELECT (fk_team_id IS NULL) as "is_null"
        FROM project_task
        WHERE id = ${taskId}::uuid
    `.execute(db);
    // If task not found, we treat it as "no team" or just return true to block.
    // In practice evaluateGuards will only call this for existing tasks.
    return result.rows[0]?.is_null ?? true;
}
