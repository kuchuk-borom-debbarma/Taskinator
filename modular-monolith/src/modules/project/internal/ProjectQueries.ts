import type { Project, ProjectMember } from '../ProjectService.ts';
import { db } from '../../../database';
import { decodeCursor, encodeCursor } from '../../../utils/utils.ts';
import { sql } from 'kysely';

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
                last_event_id AS "lastEventId", 
                created_at AS "createdAt", 
                created_at::text AS "epochPrecision",
                updated_at AS "updatedAt"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'project.created',
                id::text,
                jsonb_build_object(
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
                last_event_id AS "lastEventId", 
                created_at AS "createdAt", 
                created_at::text AS "epochPrecision",
                updated_at AS "updatedAt"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'project.updated',
                id::text,
                jsonb_build_object(
                    'projectId', id,
                    'userId', "userId",
                    'name', name,
                    'description', description,
                    'version', version
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
                'project.deleted',
                id::text,
                jsonb_build_object(
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
            RETURNING id, fk_project_id AS "projectId", fk_user_id AS "userId", version
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'project_member.created',
                id::text,
                jsonb_build_object(
                    'memberId', id,
                    'projectId', "projectId",
                    'userId', "userId",
                    'version', version
                )
            FROM inserted_members
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
                'project_member.deleted',
                id::text,
                jsonb_build_object(
                    'memberId', id,
                    'projectId', "projectId",
                    'userId', "userId"
                )
            FROM deleted_members
        )
        SELECT 1 FROM authorized
    `.execute(db);

    return true;
}

export const getProjects = async (
    userId: string,
    params: {
        first?: number;
        after?: string;
        last?: number;
        before?: string;
    } = {},
): Promise<{
    projects: Project[];
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
    const limit = Math.min(params.first || params.last || 5, 50);
    const { after, before } = params;
    const isBackward = !!before;
    const cursor = before || after;

    let cursorEpoch: string | null = null;
    let cursorId: string | null = null;

    if (cursor) {
        const decoded = decodeCursor(cursor);
        cursorEpoch = decoded.timeValue;
        cursorId = decoded.id;
    }

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
            last_event_id AS "lastEventId",
            created_at AS "createdAt",
            created_at::text as "epochPrecision",
            updated_at AS "updatedAt",
            is_owner AS "isOwner"
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
    if (isBackward) {
        rows.reverse();
    }

    const projects = rows;
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (projects.length > 0) {
        const first = projects[0]!;
        const last = projects[projects.length - 1]!;
        const firstEpoch = (first as any).epochPrecision;
        const lastEpoch = (last as any).epochPrecision;

        if (isBackward) {
            nextCursor = encodeCursor(lastEpoch, last.id);
            prevCursor = hasMore ? encodeCursor(firstEpoch, first.id) : null;
        } else {
            nextCursor = hasMore ? encodeCursor(lastEpoch, last.id) : null;
            prevCursor = after ? encodeCursor(firstEpoch, first.id) : null;
        }
    }

    return { projects, nextCursor, prevCursor };
};

export const getProjectMembers = async (
    userId: string,
    projectId: string,
    params: {
        first?: number;
        after?: string;
        last?: number;
        before?: string;
    } = {},
): Promise<{
    members: ProjectMember[];
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
    const limit = Math.min(params.first || params.last || 15, 50);
    const { after, before } = params;
    const isBackward = !!before;
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
            last_event_id AS "lastEventId", 
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
        const first = members[0]!;
        const last = members[members.length - 1]!;
        const firstEpoch = (first as any).epochPrecision;
        const lastEpoch = (last as any).epochPrecision;

        if (isBackward) {
            nextCursor = encodeCursor(lastEpoch, last.id);
            prevCursor = hasMore ? encodeCursor(firstEpoch, first.id) : null;
        } else {
            nextCursor = hasMore ? encodeCursor(lastEpoch, last.id) : null;
            prevCursor = after ? encodeCursor(firstEpoch, first.id) : null;
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
            pm.last_event_id AS "lastEventId", 
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
            pm.last_event_id AS "lastEventId", 
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
            last_event_id AS "lastEventId",
            created_at AS "createdAt",
            created_at::text AS "epochPrecision",
            updated_at AS "updatedAt"
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
            last_event_id AS "lastEventId",
            created_at AS "createdAt",
            created_at::text AS "epochPrecision",
            updated_at AS "updatedAt"
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
