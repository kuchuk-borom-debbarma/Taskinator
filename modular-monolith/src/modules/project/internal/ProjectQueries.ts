import { sql, type Transaction } from 'kysely';
import { type Database, db } from '../../../database';
import type { PaginationParams } from '../../../types/pagination.ts';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../utils/event-bus';
import { decodeCursor, encodeCursor } from '../../../utils/utils.ts';
import type { Project, ProjectMember } from '../ProjectService.ts';

export async function insertProject(param: {
    userId: string;
    name: string;
    description?: string;
}): Promise<Project | null> {
    const result = await sql<Project>`
        WITH inserted_project AS (
            INSERT INTO project (name, description, fk_user_id)
            VALUES (${param.name}, ${param.description ?? null}, ${param.userId})
            RETURNING 
                id, 
                name, 
                description, 
                fk_user_id AS "userId", 
                version, 
                created_at AS "createdAt", 
                created_at::text AS "epochPrecision",
                updated_at AS "updatedAt",
                members_count AS "membersCount",
                tasks_count AS "tasksCount",
                teams_count AS "teamsCount"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                ${KAFKA_TOPICS.PROJECT},
                id::text,
                jsonb_build_object(
                    'type', ${KAFKA_EVENTS.PROJECT.CREATED}::text,
                    'projectId', id,
                    'userId', "userId",
                    'name', name
                )
            FROM inserted_project
        )
        SELECT * FROM inserted_project
    `.execute(db);

    return result.rows[0] || null;
}

export async function updateProject(param: {
    actorId: string;
    id: string;
    version: number;
    name?: string;
    description?: string;
}): Promise<Project | null> {
    const result = await sql<Project>`
        WITH updated_project AS (
            UPDATE project 
            SET 
                name = COALESCE(${param.name ?? null}, name),
                description = COALESCE(${param.description ?? null}, description),
                version = version + 1,
                updated_at = NOW()
            WHERE id = ${param.id}::uuid 
              AND fk_user_id = ${param.actorId}
              AND version = ${param.version}
            RETURNING 
                id, 
                name, 
                description, 
                fk_user_id AS "userId", 
                version, 
                created_at AS "createdAt", 
                created_at::text AS "epochPrecision",
                updated_at AS "updatedAt",
                members_count AS "membersCount",
                tasks_count AS "tasksCount",
                teams_count AS "teamsCount"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                ${KAFKA_TOPICS.PROJECT},
                id::text,
                jsonb_build_object(
                    'type', ${KAFKA_EVENTS.PROJECT.UPDATED}::text,
                    'projectId', id,
                    'actorId', ${param.actorId}::text,
                    'name', name
                )
            FROM updated_project
        )
        SELECT * FROM updated_project
    `.execute(db);

    return result.rows[0] || null;
}

export async function deleteProjects(param: {
    actorId: string;
    projectIds: string[];
}): Promise<{ success: boolean; deletedCount: number }> {
    const ids = param.projectIds.slice(0, 1000); // Batch protection
    if (ids.length === 0) return { success: true, deletedCount: 0 };

    const result = await sql<{ id: string }>`
        WITH deleted_projects AS (
            DELETE FROM project 
            WHERE id = ANY(${ids}::uuid[]) 
              AND fk_user_id = ${param.actorId}
            RETURNING id, name, fk_user_id AS "userId"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                ${KAFKA_TOPICS.PROJECT},
                id::text,
                jsonb_build_object(
                    'type', ${KAFKA_EVENTS.PROJECT.DELETED}::text,
                    'projectId', id,
                    'userId', "userId",
                    'name', name
                )
            FROM deleted_projects
        )
        SELECT id FROM deleted_projects
    `.execute(db);

    return {
        success: true,
        deletedCount: result.rows.length,
    };
}

export async function insertProjectMembers(param: {
    actorId: string;
    projectId: string;
    userIds: string[];
}): Promise<boolean> {
    const ids = param.userIds.slice(0, 1000);
    if (ids.length === 0) return true;

    await sql`
        WITH authorized AS (
            SELECT 1 FROM project 
            WHERE id = ${param.projectId}::uuid 
              AND (
                fk_user_id = ${param.actorId} -- Owner
                OR EXISTS (
                    SELECT 1 FROM project_member 
                    WHERE fk_project_id = ${param.projectId}::uuid 
                      AND fk_user_id = ${param.actorId} -- Existing Member
                )
              )
        ),
        inserted_members AS (
            INSERT INTO project_member (fk_project_id, fk_user_id)
            SELECT ${param.projectId}::uuid, u_id
            FROM UNNEST(${ids}::text[]) AS u_id
            WHERE EXISTS (SELECT 1 FROM authorized)
            ON CONFLICT (fk_project_id, fk_user_id) DO NOTHING
            RETURNING id, fk_project_id AS "projectId", fk_user_id AS "userId"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                ${KAFKA_TOPICS.PROJECT},
                "projectId"::text,
                jsonb_build_object(
                    'type', ${KAFKA_EVENTS.PROJECT.MEMBERS_ADDED}::text,
                    'projectId', "projectId",
                    'addedUserIds', (SELECT json_agg("userId") FROM inserted_members),
                    'actorId', ${param.actorId}::text
                )
            FROM (SELECT DISTINCT "projectId" FROM inserted_members) AS sub
        )
        SELECT 1 FROM authorized
    `.execute(db);

    return true;
}

export async function deleteProjectMembers(param: {
    actorId: string;
    projectId: string;
    userIds: string[];
}): Promise<boolean> {
    const ids = param.userIds.slice(0, 1000);
    if (ids.length === 0) return true;

    await sql`
        WITH authorized AS (
            SELECT 1 FROM project 
            WHERE id = ${param.projectId}::uuid 
              AND (
                fk_user_id = ${param.actorId} -- Owner
                OR EXISTS (
                    SELECT 1 FROM project_member 
                    WHERE fk_project_id = ${param.projectId}::uuid 
                      AND fk_user_id = ${param.actorId} -- Existing Member
                )
              )
        ),
        deleted_members AS (
            DELETE FROM project_member
            WHERE fk_project_id = ${param.projectId}::uuid
              AND fk_user_id = ANY(${ids}::text[])
              AND EXISTS (SELECT 1 FROM authorized)
            RETURNING id, fk_project_id AS "projectId", fk_user_id AS "userId"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                ${KAFKA_TOPICS.PROJECT},
                "projectId"::text,
                jsonb_build_object(
                    'type', ${KAFKA_EVENTS.PROJECT.MEMBERS_REMOVED}::text,
                    'projectId', "projectId",
                    'removedUserIds', (SELECT json_agg("userId") FROM deleted_members),
                    'actorId', ${param.actorId}::text
                )
            FROM (SELECT DISTINCT "projectId" FROM deleted_members) AS sub
        )
        SELECT 1 FROM authorized
    `.execute(db);

    return true;
}

export const getProjects = async (
    userId: string,
    params: PaginationParams = {},
): Promise<{
    projects: Project[];
    totalCount: number;
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
    const limit = Math.min(params.first || params.last || 10, 50);
    const { first, last, after, before } = params;
    const isBackward = !!last || !!before;
    const cursor = before || after;

    let cursorEpoch: string | null = null;
    let cursorId: string | null = null;

    if (cursor) {
        const decoded = decodeCursor(cursor);
        cursorEpoch = decoded.timeValue;
        cursorId = decoded.id;
    }

    const countResult = await sql<{ count: string }>`
        SELECT count(*)::text as count
        FROM (
            SELECT p.id FROM project p WHERE p.fk_user_id = ${userId}::text
            UNION
            SELECT pm.fk_project_id FROM project_member pm WHERE pm.fk_user_id = ${userId}::text
        ) as sub
    `.execute(db);
    const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);

    const result = await sql<
        Project & { isOwner: boolean; epochPrecision: string }
    >`
        WITH combined_projects AS (
            SELECT p.*, true as is_owner
            FROM project p
            WHERE p.fk_user_id = ${userId}::text
            UNION ALL
            SELECT p.*, false as is_owner
            FROM project p
            JOIN project_member pm ON pm.fk_project_id = p.id
            WHERE pm.fk_user_id = ${userId}::text
              AND p.fk_user_id <> ${userId}::text
        )
        SELECT 
            id,
            name,
            description,
            fk_user_id AS "userId",
            version,
            created_at AS "createdAt",
            created_at::text as "epochPrecision",
            updated_at AS "updatedAt",
            is_owner AS "isOwner",
            members_count AS "membersCount",
            tasks_count AS "tasksCount",
            teams_count AS "teamsCount"
        FROM combined_projects
        WHERE (
            ${cursorEpoch}::text IS NULL 
            OR (
                CASE 
                  WHEN ${isBackward} THEN (created_at > ${cursorEpoch}::timestamptz OR (created_at = ${cursorEpoch}::timestamptz AND id > ${cursorId}::uuid))
                  ELSE (created_at < ${cursorEpoch}::timestamptz OR (created_at = ${cursorEpoch}::timestamptz AND id < ${cursorId}::uuid))
                END
            )
        )
        ORDER BY created_at ${sql.raw(isBackward ? 'ASC' : 'DESC')}, id ${sql.raw(isBackward ? 'ASC' : 'DESC')}
        LIMIT ${limit + 1}
    `.execute(db);

    let rows = result.rows;
    const hasMore = rows.length > limit;
    if (hasMore) {
        rows = rows.slice(0, limit);
    }
    // Relay: if last is used, we order ASC in SQL, then reverse to get DESC final list
    if (isBackward) {
        rows.reverse();
    }

    const projects = rows;
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (projects.length > 0) {
        const firstRow = projects[0]!;
        const lastRow = projects[projects.length - 1]!;

        if (last || before) {
            // Backward pagination
            nextCursor = encodeCursor(lastRow.epochPrecision, lastRow.id);
            prevCursor = hasMore
                ? encodeCursor(firstRow.epochPrecision, firstRow.id)
                : null;
        } else {
            // Forward pagination
            nextCursor = hasMore
                ? encodeCursor(lastRow.epochPrecision, lastRow.id)
                : null;
            prevCursor = after
                ? encodeCursor(firstRow.epochPrecision, firstRow.id)
                : null;
        }
    }

    return { projects, totalCount, nextCursor, prevCursor };
};

export const getProjectMembers = async (
    userId: string,
    projectId: string,
    params: PaginationParams = {},
): Promise<{
    members: ProjectMember[];
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
    const limit = Math.min(params.first || params.last || 15, 50);
    const { first, last, after, before } = params;
    const isBackward = !!last || !!before;
    const cursor = before || after;

    let cursorEpoch: string | null = null;
    let cursorId: string | null = null;

    if (cursor) {
        const decoded = decodeCursor(cursor);
        cursorEpoch = decoded.timeValue;
        cursorId = decoded.id;
    }

    const result = await sql<ProjectMember & { epochPrecision: string }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            LIMIT 1
        )
        SELECT 
            id, 
            fk_user_id AS "userId", 
            fk_project_id AS "projectId", 
            version, 
            created_at AS "createdAt", 
            created_at::text as "epochPrecision",
            updated_at AS "updatedAt"
        FROM project_member
        WHERE fk_project_id = ${projectId}::uuid
          AND EXISTS (SELECT 1 FROM auth_check)
          AND (
              ${cursorEpoch}::text IS NULL
              OR (
                  CASE 
                    WHEN ${isBackward} THEN (created_at > ${cursorEpoch}::timestamptz OR (created_at = ${cursorEpoch}::timestamptz AND id > ${cursorId}::uuid))
                    ELSE (created_at < ${cursorEpoch}::timestamptz OR (created_at = ${cursorEpoch}::timestamptz AND id < ${cursorId}::uuid))
                  END
              )
          )
        ORDER BY created_at ${sql.raw(isBackward ? 'ASC' : 'DESC')}, id ${sql.raw(isBackward ? 'ASC' : 'DESC')}
        LIMIT ${limit + 1}
    `.execute(db);

    let rows = result.rows;
    const hasMore = rows.length > limit;
    if (hasMore) {
        rows = rows.slice(0, limit);
    }
    if (isBackward) {
        rows.reverse();
    }

    const members = rows;
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (members.length > 0) {
        const firstRow = members[0]!;
        const lastRow = members[members.length - 1]!;

        if (last || before) {
            nextCursor = encodeCursor(lastRow.epochPrecision, lastRow.id);
            prevCursor = hasMore
                ? encodeCursor(firstRow.epochPrecision, firstRow.id)
                : null;
        } else {
            nextCursor = hasMore
                ? encodeCursor(lastRow.epochPrecision, lastRow.id)
                : null;
            prevCursor = after
                ? encodeCursor(firstRow.epochPrecision, firstRow.id)
                : null;
        }
    }

    return { members, nextCursor, prevCursor };
};

export const getProjectMembersByIds = async (
    memberIds: string[],
): Promise<ProjectMember[]> => {
    if (memberIds.length === 0) return [];

    const result = await sql<ProjectMember>`
        SELECT 
            pm.id, 
            pm.fk_user_id AS "userId", 
            pm.fk_project_id AS "projectId", 
            pm.version, 
            pm.created_at AS "createdAt", 
            pm.created_at::text AS "epochPrecision",
            pm.updated_at AS "updatedAt"
        FROM project_member pm
        WHERE pm.id = ANY(${memberIds}::uuid[])
    `.execute(db);

    return result.rows;
};

export const getProjectMembersByActorIdAndIds = async (
    userId: string,
    memberIds: string[],
): Promise<ProjectMember[]> => {
    if (memberIds.length === 0) return [];

    const result = await sql<ProjectMember>`
        SELECT 
            pm.id, 
            pm.fk_user_id AS "userId", 
            pm.fk_project_id AS "projectId", 
            pm.version, 
            pm.created_at AS "createdAt", 
            pm.created_at::text AS "epochPrecision",
            pm.updated_at AS "updatedAt"
        FROM project_member pm
        WHERE pm.id = ANY(${memberIds}::uuid[])
          AND EXISTS (
              SELECT 1 FROM project p 
              LEFT JOIN project_member pm2 ON pm2.fk_project_id = p.id
              WHERE p.id = pm.fk_project_id
                AND (p.fk_user_id = ${userId}::text OR pm2.fk_user_id = ${userId}::text)
          )
    `.execute(db);

    return result.rows;
};

export const getProjectsByIds = async (
    projectIds: string[],
): Promise<Project[]> => {
    if (projectIds.length === 0) return [];

    const result = await sql<Project>`
        SELECT 
            id,
            name,
            description,
            fk_user_id AS "userId",
            version,
            created_at AS "createdAt",
            created_at::text AS "epochPrecision",
            updated_at AS "updatedAt",
            members_count AS "membersCount",
            tasks_count AS "tasksCount",
            teams_count AS "teamsCount"
        FROM project
        WHERE id = ANY(${projectIds}::uuid[])
    `.execute(db);

    return result.rows;
};

export const getProjectsByActorIdAndProjectIds = async (
    userId: string,
    projectIds: string[],
): Promise<Project[]> => {
    if (projectIds.length === 0) return [];

    const result = await sql<Project>`
        SELECT 
            id,
            name,
            description,
            fk_user_id AS "userId",
            version,
            created_at AS "createdAt",
            created_at::text AS "epochPrecision",
            updated_at AS "updatedAt",
            members_count AS "membersCount",
            tasks_count AS "tasksCount",
            teams_count AS "teamsCount"
        FROM project
        WHERE id = ANY(${projectIds}::uuid[])
          AND (
            fk_user_id = ${userId}
            OR EXISTS (
                SELECT 1 FROM project_member 
                WHERE fk_project_id = project.id 
                  AND fk_user_id = ${userId}
            )
          )
    `.execute(db);

    return result.rows;
};

export const updateProjectTeamCountsBulk = async (
    updates: Map<string, number>,
    trx?: Transaction<Database>,
): Promise<void> => {
    const entries = Array.from(updates.entries());
    if (entries.length === 0) return;

    const ids = entries.map(([id]) => id);
    const deltas = entries.map(([_, delta]) => delta);

    await sql`
        UPDATE project SET 
            teams_count = project.teams_count + v.delta,
            updated_at = NOW()
        FROM (
            SELECT * FROM UNNEST(${ids}::uuid[], ${deltas}::int[])
        ) AS v(id, delta)
        WHERE project.id = v.id
    `.execute(trx || db);
};

export const updateProjectMemberCountsBulk = async (
    updates: Map<string, number>,
    trx?: Transaction<Database>,
): Promise<void> => {
    const entries = Array.from(updates.entries());
    if (entries.length === 0) return;

    const ids = entries.map(([id]) => id);
    const deltas = entries.map(([_, delta]) => delta);

    await sql`
        UPDATE project SET 
            members_count = project.members_count + v.delta,
            updated_at = NOW()
        FROM (
            SELECT * FROM UNNEST(${ids}::uuid[], ${deltas}::int[])
        ) AS v(id, delta)
        WHERE project.id = v.id
    `.execute(trx || db);
};

export async function updateProjectTaskCountsBulk(
    updates: Map<string, number>,
    trx?: Transaction<Database>,
): Promise<void> {
    const entries = Array.from(updates.entries());
    if (entries.length === 0) return;

    const ids = entries.map(([id]) => id);
    const deltas = entries.map(([, delta]) => delta);

    await sql`
        UPDATE project SET 
            tasks_count = project.tasks_count + v.delta,
            updated_at = NOW()
        FROM (
            SELECT * FROM UNNEST(${ids}::uuid[], ${deltas}::int[])
        ) AS v(id, delta)
        WHERE project.id = v.id
    `.execute(trx || db);
}

/**
 * Atomic removal of project members and the project record itself.
 */
export async function purgeProjectCoreAndMembersByProjectIds(
    trx: any,
    projectIds: string[],
): Promise<void> {
    if (projectIds.length === 0) return;

    // Ordered deletion to prevent potential reference issues even without FKs
    await trx
        .deleteFrom('project_member')
        .where('fk_project_id', 'in', projectIds)
        .execute();

    await trx.deleteFrom('project').where('id', 'in', projectIds).execute();
}

/**
 * Bulk repair of User Project counts.
 */
export async function incrementUserProjectCountsBulk(
    trx: any,
    deltas: Map<string, number>,
): Promise<void> {
    const entries = Array.from(deltas.entries());
    if (entries.length === 0) return;

    const userIds = entries.map(([uid]) => uid);
    const deltaList = entries.map(([, d]) => d);

    await sql`
        UPDATE users SET 
            projects_count = users.projects_count + v.delta
        FROM (
            SELECT * FROM UNNEST(${userIds}::text[], ${deltaList}::int[])
        ) AS v(uid, delta)
        WHERE users.id = v.uid
    `.execute(trx);
}

/**
 * Bulk repair of Project Member counts.
 */
export async function incrementProjectMemberCountsBulk(
    deltas: Map<string, number>,
    trx?: Transaction<Database>,
): Promise<void> {
    const entries = Array.from(deltas.entries());
    if (entries.length === 0) return;

    const projectIds = entries.map(([pid]) => pid);
    const deltaList = entries.map(([, d]) => d);

    await sql`
        UPDATE project SET 
            members_count = project.members_count + v.delta,
            updated_at = NOW()
        FROM (
            SELECT * FROM UNNEST(${projectIds}::uuid[], ${deltaList}::int[])
        ) AS v(pid, delta)
        WHERE project.id = v.pid
    `.execute(trx || db);
}

/**
 * Batch removes members from projects across multiple project IDs.
 * Returns the list of project IDs where deletions actually occurred for counter repair.
 *
 * NOTE: We loop per delta rather than using a 2D unnest(::text[][]) pattern
 * because Kysely cannot correctly serialize a nested JS string[][] into a
 * PostgreSQL text[][] parameter, causing a "42809: requires array on right side" error.
 * One DELETE per project is still very fast at typical batch sizes.
 */
export const purgeProjectMembersBatch = async (
    deltas: { projectId: string; userIds: string[] }[],
    trx?: Transaction<Database>,
): Promise<{ affectedProjectMemberCounts: Map<string, number> }> => {
    if (deltas.length === 0) return { affectedProjectMemberCounts: new Map() };

    const counts = new Map<string, number>();

    for (const { projectId, userIds } of deltas) {
        if (userIds.length === 0) continue;

        const result = await sql<{ projectId: string }>`
            DELETE FROM project_member
            WHERE fk_project_id = ${projectId}::uuid
              AND fk_user_id = ANY(${userIds}::text[])
            RETURNING fk_project_id AS "projectId"
        `.execute(trx || db);

        for (const row of result.rows) {
            counts.set(row.projectId, (counts.get(row.projectId) || 0) + 1);
        }
    }

    return { affectedProjectMemberCounts: counts };
};

/**
 * Purges all membership records for specified projects.
 * Used during full project decommissioning.
 */
export const purgeProjectMembersByProjectIdsBatch = async (
    projectIds: string[],
    trx?: Transaction<Database>,
): Promise<{ affectedCount: number }> => {
    if (projectIds.length === 0) return { affectedCount: 0 };

    const result = await (trx || db)
        .deleteFrom('project_member')
        .where('fk_project_id', 'in', projectIds)
        .executeTakeFirst();

    return { affectedCount: Number(result.numDeletedRows) };
};
