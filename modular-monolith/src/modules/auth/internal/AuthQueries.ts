import { db } from '../../../database';
import { sql } from 'kysely';

/**
 * Repository for Auth-related database operations.
 */

export const updateUserProjectCountsBulk = async (
    updates: Map<string, number>,
): Promise<void> => {
    const entries = Array.from(updates.entries());
    if (entries.length === 0) return;

    const ids = entries.map(([id]) => id);
    const deltas = entries.map(([_, delta]) => delta);

    await sql`
        UPDATE users SET 
            projects_count = users.projects_count + v.delta,
            updated_at = NOW()
        FROM (
            SELECT * FROM UNNEST(${ids}::uuid[], ${deltas}::int[])
        ) AS v(id, delta)
        WHERE users.id = v.id
    `.execute(db);
};
