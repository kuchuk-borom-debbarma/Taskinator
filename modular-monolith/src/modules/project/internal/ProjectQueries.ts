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
            VALUES (${data.name}, ${data.description ?? null}, ${data.userId}, ${getTimeString()})
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
    params: { first?: number; after?: string; last?: number; before?: string } = {},
): Promise<{ projects: Project[]; nextCursor: string | null; prevCursor: string | null }> => {
    const limit = Math.min(params.first || params.last || 5, 50);
    const { after, before } = params;
    const isBackward = !!before;
    const cursor = before || after;

    let cursorDate: string | null = null;
    let cursorId: string | null = null;

    if (cursor && cursor.includes('|')) {
        const parts = cursor.split('|');
        if (parts.length === 2) {
            cursorDate = parts[0]!;
            cursorId = parts[1]!;
        }
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
            updated_at AS "updatedAt",
            is_owner AS "isOwner"
        FROM combined_projects
        WHERE (
            ${cursorDate}::timestamptz IS NULL 
            OR (
                CASE 
                  WHEN ${isBackward} THEN (created_at > ${cursorDate}::timestamptz OR (created_at = ${cursorDate}::timestamptz AND id > ${cursorId}::uuid))
                  ELSE (created_at < ${cursorDate}::timestamptz OR (created_at = ${cursorDate}::timestamptz AND id < ${cursorId}::uuid))
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
        const firstDateStr = first.createdAt instanceof Date ? first.createdAt.toISOString() : first.createdAt;
        const lastDateStr = last.createdAt instanceof Date ? last.createdAt.toISOString() : last.createdAt;

        if (isBackward) {
            nextCursor = `${lastDateStr}|${last.id}`;
            prevCursor = hasMore ? `${firstDateStr}|${first.id}` : null;
        } else {
            nextCursor = hasMore ? `${lastDateStr}|${last.id}` : null;
            prevCursor = after ? `${firstDateStr}|${first.id}` : null;
        }
    }

    return { projects, nextCursor, prevCursor };
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
    params: { first?: number; after?: string; last?: number; before?: string } = {},
): Promise<{ members: ProjectMember[]; nextCursor: string | null; prevCursor: string | null }> => {
    const limit = Math.min(params.first || params.last || 5, 50);
    const { after, before } = params;
    const isBackward = !!before;
    const cursor = before || after;

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
              ${cursor ?? null}::uuid IS NULL
              OR (
                  CASE 
                    WHEN ${isBackward} THEN id < ${cursor ?? null}::uuid
                    ELSE id > ${cursor ?? null}::uuid
                  END
              )
          )
        ORDER BY id ${sql.raw(isBackward ? 'DESC' : 'ASC')}
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

        if (isBackward) {
            nextCursor = last.id;
            prevCursor = hasMore ? first.id : null;
        } else {
            nextCursor = hasMore ? last.id : null;
            prevCursor = after ? first.id : null;
        }
    }

    return { members, nextCursor, prevCursor };
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
    return result.rows.map((r) => r.id);
};
export const searchProjectMembers = async (params: {
    actorId: string;
    projectId: string;
    search?: string;
    first?: number;
    after?: string;
    last?: number;
    before?: string;
}): Promise<{
    users: { id: string; username: string; email: string }[];
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
    const search = params.search?.trim() ?? '';
    const { after, before } = params;
    const isBackward = !!before;
    const cursor = before || after;
    const limit = Math.min(params.first || params.last || 5, 50);

    const rows = await sql<{ id: string; username: string; email: string }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${params.projectId}::uuid AND fk_user_id = ${params.actorId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${params.projectId}::uuid AND fk_user_id = ${params.actorId}
            LIMIT 1
        ),
        project_owner AS (
            SELECT u.id, u.username, u.email
            FROM project p
            JOIN users u ON u.id::text = p.fk_user_id
            WHERE p.id = ${params.projectId}::uuid
        ),
        project_members AS (
            SELECT u.id, u.username, u.email
            FROM project_member pm
            JOIN users u ON u.id::text = pm.fk_user_id
            WHERE pm.fk_project_id = ${params.projectId}::uuid
        ),
        all_eligible_users AS (
            SELECT * FROM project_owner
            UNION
            SELECT * FROM project_members
        )
        SELECT id, username, email
        FROM all_eligible_users
        WHERE EXISTS (SELECT 1 FROM auth_check)
          AND (
            ${search} = ''
            OR username ILIKE '%' || ${search} || '%'
            OR id::text = ${search}
          )
          AND (
            ${cursor ?? null}::uuid IS NULL
            OR (
                CASE 
                  WHEN ${isBackward} THEN id < ${cursor ?? null}::uuid
                  ELSE id > ${cursor ?? null}::uuid
                END
            )
          )
        ORDER BY id ${sql.raw(isBackward ? 'DESC' : 'ASC')}
        LIMIT ${limit + 1}
    `.execute(db);

    let resultRows = rows.rows;
    const hasMore = resultRows.length > limit;
    if (hasMore) {
        resultRows = resultRows.slice(0, limit);
    }
    if (isBackward) {
        resultRows.reverse();
    }

    const users = resultRows;
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (users.length > 0) {
        const first = users[0]!;
        const last = users[users.length - 1]!;

        if (isBackward) {
            nextCursor = last.id;
            prevCursor = hasMore ? first.id : null;
        } else {
            nextCursor = hasMore ? last.id : null;
            prevCursor = after ? first.id : null;
        }
    }

    return { users, nextCursor, prevCursor };
};

export const getProjectsByIds = async (
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

export interface UpdateProjectParam {
    userId: string;
    projectId: string;
    name?: string;
    description?: string | null;
}

export const updateProject = async (
    data: UpdateProjectParam,
): Promise<Project | null> => {
    const result = await sql<Project>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            LIMIT 1
        ),
        updated_project AS (
            UPDATE project
            SET name = CASE WHEN ${data.name !== undefined} THEN ${data.name ?? null} ELSE name END,
                description = CASE WHEN ${data.description !== undefined} THEN ${data.description ?? null} ELSE description END,
                version = version + 1,
                updated_at = ${getTimeString()}
            WHERE id = ${data.projectId}::uuid
              AND EXISTS (SELECT 1 FROM auth_check)
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.updated',
                   id::text,
                   jsonb_build_object(
                       'projectId', id,
                       'userId', ${data.userId}::text,
                       'updates', ${JSON.stringify({ name: data.name, description: data.description })}::jsonb
                   )
            FROM updated_project
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
        FROM updated_project
    `.execute(db);

    return result.rows[0] || null;
};
