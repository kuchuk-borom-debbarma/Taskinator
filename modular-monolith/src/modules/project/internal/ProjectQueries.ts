import type {
    AddProjectMembersParam,
    CreateProjectParam,
    DeleteProjectMembersParam,
    DeleteProjectsParam,
    Project,
    ProjectMember,
} from '../ProjectService.ts';
import { db } from '../../../database';
import { getTimeString } from '../../../utils/utils.ts';
import { sql } from 'kysely';

export const insertProject = async (
    data: CreateProjectParam,
): Promise<Project | null> => {
    const result = await sql<Project>`
        WITH inserted_project AS (
            INSERT INTO project (name, description, fk_user_id, created_at)
            VALUES (${data.name}, ${data.description}, ${data.userId}, ${getTimeString()})
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.created',
                   id::text,
                   jsonb_build_object(
                       'projectId', id,
                       'userId', fk_user_id,
                       'name', name
                   )
            FROM inserted_project
        )
        SELECT 
            id,
            name,
            description,
            fk_user_id AS "userId",
            version,
            last_event_id AS "lastEventId",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        FROM inserted_project
    `.execute(db);

    const added = result.rows[0];
    if (!added) return null;

    return added;
};

export const insertProjects = async (
    data: CreateProjectParam[],
): Promise<Project[]> => {
    if (!data.length) return [];
    const names = data.map((d) => d.name);
    const descriptions = data.map((d) => d.description || '');
    const userIds = data.map((d) => d.userId);

    const result = await sql<Project>`
        WITH batch_data AS (
            SELECT * FROM unnest(${names}::text[], ${descriptions}::text[], ${userIds}::text[]) AS t(name, description, user_id)
        ),
        inserted_projects AS (
            INSERT INTO project (name, description, fk_user_id, created_at)
            SELECT name, description, user_id, ${getTimeString()}
            FROM batch_data
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.created',
                   id::text,
                   jsonb_build_object(
                       'projectId', id,
                       'userId', fk_user_id,
                       'name', name
                   )
            FROM inserted_projects
        )
        SELECT 
            id,
            name,
            description,
            fk_user_id AS "userId",
            version,
            last_event_id AS "lastEventId",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        FROM inserted_projects
    `.execute(db);

    return result.rows;
};

export const insertProjectMembers = async (
    data: AddProjectMembersParam,
): Promise<ProjectMember[]> => {
    const result = await sql<ProjectMember>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
        ),
        valid_users AS (
            SELECT id::text AS user_id
            FROM users
            WHERE id::text = ANY(${data.usersToAdd}::text[])
        ),
        inserted_members AS (
            INSERT INTO project_member (fk_user_id, fk_project_id)
            SELECT user_id,
                   ${data.projectId}::uuid
            FROM valid_users
            WHERE EXISTS (SELECT 1 FROM auth_check)
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.member.added',
                   fk_project_id::text,
                   jsonb_build_object(
                       'projectId', fk_project_id,
                       'userId', fk_user_id,
                       'actorId', ${data.userId}::text,
                       'memberId', id
                   )
            FROM inserted_members
        )
        SELECT 
            id, 
            fk_user_id    AS "userId", 
            fk_project_id AS "projectId", 
            version,
            last_event_id AS "lastEventId",
            created_at    AS "createdAt", 
            updated_at    AS "updatedAt"
        FROM inserted_members
    `.execute(db);

    if (result.rows.length === 0)
        throw new Error('Unauthorized or no members added');

    return result.rows;
};

export const deleteProjects = async (data: DeleteProjectsParam) => {
    const result = await sql<Project>`
        WITH deleted_projects AS (
            DELETE FROM project
            WHERE id = ANY(${data.projectIds}::uuid[])
              AND fk_user_id = ${data.userId}
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.deleted',
                   id::text,
                   jsonb_build_object(
                       'userId', ${data.userId}::text,
                       'projectId', id
                   )
            FROM deleted_projects
        )
        SELECT 
            id,
            name,
            description,
            fk_user_id AS "userId",
            version,
            last_event_id AS "lastEventId",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        FROM deleted_projects
    `.execute(db);

    if (result.rows.length !== data.projectIds.length) {
        throw new Error('Unauthorized or some projects not found');
    }

    return result.rows;
};

export const deleteProjectMembers = async (data: DeleteProjectMembersParam) => {
    const result = await sql<ProjectMember>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
        ),
        deleted_members AS (
            DELETE FROM project_member
            WHERE fk_project_id = ${data.projectId}::uuid
              AND id = ANY (${data.memberIds}::uuid[])
              AND EXISTS (SELECT 1 FROM auth_check)
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.member.deleted',
                   fk_project_id::text,
                   jsonb_build_object(
                       'userId', fk_user_id,
                       'projectId', fk_project_id,
                       'actorId', ${data.userId}::text,
                       'memberId', id
                   )
            FROM deleted_members
        )
        SELECT
            id,
            fk_user_id    AS "userId",
            fk_project_id AS "projectId",
            version,
            last_event_id AS "lastEventId",
            created_at    AS "createdAt",
            updated_at    AS "updatedAt"
        FROM deleted_members
    `.execute(db);

    return result.rows;
};

export const deleteAllProjectMembers = async (projectId: string) => {
    await db
        .deleteFrom('project_member')
        .where('fk_project_id', '=', sql`${projectId}::uuid` as any)
        .execute();
};

export const getProjects = async (
    userId: string,
    params: { cursor?: string; limit?: number } = {}
): Promise<{ projects: Project[]; nextCursor: string | null }> => {
    const limit = Math.min(params.limit ?? 20, 50);
    const cursor = params.cursor; // Expecting format: "YYYY-MM-DDTHH:MM:SS.sssZ|uuid"

    let cursorDate: string | null = null;
    let cursorId: string | null = null;

    if (cursor && cursor.includes('|')) {
        [cursorDate, cursorId] = cursor.split('|');
    }

        const result = await sql<Project & { isOwner: boolean }>`
        WITH combined_projects AS (
            SELECT p.*, true as is_owner
            FROM project p
            WHERE p.fk_user_id = ${userId}::text
            UNION ALL
            SELECT p.*, false as is_owner
            FROM project p
            JOIN project_member pm ON pm.fk_project_id = p.id
            WHERE pm.fk_user_id = ${userId}::text
              AND p.fk_user_id <> ${userId}::text -- Avoid duplicates if user is somehow both
        )
        SELECT 
            id,
            name,
            description,
            fk_user_id AS "userId",
            version,
            last_event_id AS "lastEventId",
            created_at AS "createdAt",
            updated_at AS "updatedAt",
            is_owner AS "isOwner"
        FROM combined_projects
        WHERE (
            ${cursorDate}::timestamptz IS NULL 
            OR created_at < ${cursorDate}::timestamptz
            OR (created_at = ${cursorDate}::timestamptz AND id < ${cursorId}::uuid)
        )
        ORDER BY created_at DESC, id DESC
        LIMIT ${limit + 1}
    `.execute(db);

    const hasMore = result.rows.length > limit;
    const projects = hasMore ? result.rows.slice(0, limit) : result.rows;
    
    let nextCursor: string | null = null;
    if (hasMore && projects.length > 0) {
        const last = projects[projects.length - 1]!;
        // Assuming createdAt is returned as a Date or ISO string
        const dateStr = last.createdAt instanceof Date ? last.createdAt.toISOString() : last.createdAt;
        nextCursor = `${dateStr}|${last.id}`;
    }

    return { projects, nextCursor };
};

export const getProject = async (
    userId: string,
    projectId: string,
): Promise<Project | null> => {
    const result = await sql<Project & { isOwner: boolean }>`
        SELECT 
            id,
            name,
            description,
            fk_user_id AS "userId",
            version,
            last_event_id AS "lastEventId",
            created_at AS "createdAt",
            updated_at AS "updatedAt",
            (fk_user_id = ${userId}) AS "isOwner"
        FROM project
        WHERE id = ${projectId}::uuid
          AND (
            fk_user_id = ${userId}
            OR EXISTS (
                SELECT 1 FROM project_member 
                WHERE fk_project_id = ${projectId}::uuid 
                  AND fk_user_id = ${userId}
            )
          )
    `.execute(db);

    return result.rows[0] || null;
};

export const getProjectMembers = async (
    userId: string,
    projectId: string,
    params: { cursor?: string; limit?: number } = {},
): Promise<{ members: ProjectMember[]; nextCursor: string | null }> => {
    const limit = Math.min(params.limit ?? 20, 50);
    const cursor = params.cursor;

    const result = await sql<ProjectMember>`
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
            updated_at AS "updatedAt"
        FROM project_member
        WHERE fk_project_id = ${projectId}::uuid
          AND EXISTS (SELECT 1 FROM auth_check)
          AND (
              ${cursor}::uuid IS NULL
              OR id > ${cursor}::uuid
          )
        ORDER BY id
        LIMIT ${limit + 1}
    `.execute(db);

    const hasMore = result.rows.length > limit;
    const members = hasMore ? result.rows.slice(0, limit) : result.rows;
    const nextCursor = hasMore ? members[members.length - 1]!.id : null;

    return { members, nextCursor };
};

/**
 * Fetches all project IDs where the user is either the owner or a member.
 */
export const getUserProjectIds = async (userId: string): Promise<string[]> => {
    const result = await sql<{ id: string }>`
        SELECT id FROM project WHERE fk_user_id = ${userId}
        UNION
        SELECT fk_project_id FROM project_member WHERE fk_user_id = ${userId}
    `.execute(db);
    return result.rows.map(r => r.id);
};

