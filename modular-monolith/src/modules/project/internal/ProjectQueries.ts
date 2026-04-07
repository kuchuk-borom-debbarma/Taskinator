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

export const getProjects = async (userId: string): Promise<Project[]> => {
    const projects = await db
        .selectFrom('project')
        .selectAll()
        .where('fk_user_id', '=', userId)
        .execute();

    return projects.map((p) => ({
        userId: p.fk_user_id,
        updatedAt: p.updated_at,
        name: p.name,
        id: p.id,
        version: p.version,
        lastEventId: p.last_event_id,
        description: p.description,
        createdAt: p.created_at,
    }));
};

export const getProject = async (
    userId: string,
    projectId: string,
): Promise<Project | null> => {
    const p = await db
        .selectFrom('project')
        .selectAll()
        .where('id', '=', sql`${projectId}::uuid` as any)
        .where('fk_user_id', '=', userId)
        .executeTakeFirst();

    if (!p) return null;

    return {
        userId: p.fk_user_id,
        updatedAt: p.updated_at,
        name: p.name,
        id: p.id,
        version: p.version,
        lastEventId: p.last_event_id,
        description: p.description,
        createdAt: p.created_at,
    };
};

export const getProjectMembers = async (
    userId: string,
    projectId: string,
): Promise<ProjectMember[]> => {
    const result = await sql<ProjectMember>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}
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
    `.execute(db);
    return result.rows;
};
