import type {
    AddProjectMembersParam,
    CreateProjectParam,
    DeleteProjectMembersParam,
    DeleteProjectsParam,
    Project,
    ProjectMember,
} from '../ProjectService.ts';
import { db } from '../../../database';
import { sql } from 'kysely';

export const insertProject = async (
    data: CreateProjectParam,
): Promise<Project | null> => {
    const added = await db
        .insertInto('project')
        .values({
            name: data.name,
            description: data.description,
            created_at: new Date().toUTCString(),
            fk_user_id: data.userId,
        })
        .returningAll()
        .executeTakeFirst();

    if (!added) return null;

    return {
        createdAt: added.created_at,
        description: added.description,
        id: added.id,
        name: added.name,
        version: added.version,
        lastEventId: added.last_event_id,
        updatedAt: added.updated_at,
        userId: added.fk_user_id,
    };
};

export const insertProjects = async (
    data: CreateProjectParam[],
): Promise<Project[]> => {
    const added = await db
        .insertInto('project')
        .values(
            data.map((p) => ({
                fk_user_id: p.userId,
                name: p.name,
                description: p.description,
                created_at: new Date().toUTCString(),
            })),
        )
        .returningAll()
        .execute();

    return added.map((p) => ({
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

export const insertProjectMembers = async (
    data: AddProjectMembersParam,
): Promise<ProjectMember[]> => {
    const result = await sql<ProjectMember>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId} AND fk_user_id = ${data.userId}
        )
        INSERT INTO project_member (fk_user_id, fk_project_id)
        SELECT unnest(${data.usersToAdd}::text[]),
               ${data.projectId}
        WHERE EXISTS (SELECT 1 FROM auth_check)
        RETURNING
            id, 
            fk_user_id    AS "userId", 
            fk_project_id AS "projectId", 
            version,
            last_event_id AS "lastEventId",
            created_at    AS "createdAt", 
            updated_at    AS "updatedAt"
    `.execute(db);

    if (result.rows.length === 0)
        throw new Error('Unauthorized or no members added');

    return result.rows;
};

export const deleteProjects = async (data: DeleteProjectsParam) => {
    const deleted = await db
        .deleteFrom('project')
        .where('id', 'in', data.projectIds)
        .where('fk_user_id', '=', data.userId)
        .returningAll()
        .execute();

    if (deleted.length !== data.projectIds.length) {
        throw new Error('Unauthorized or some projects not found');
    }

    return deleted.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        userId: p.fk_user_id,
        version: p.version,
        lastEventId: p.last_event_id,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
    }));
};

export const deleteProjectMembers = async (
    data: DeleteProjectMembersParam,
) => {
    const result = await sql<ProjectMember>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId} AND fk_user_id = ${data.userId}
        )
        DELETE
        FROM project_member
        WHERE fk_project_id = ${data.projectId}
          AND id = ANY (${data.memberIds}::text[])
          AND EXISTS (SELECT 1 FROM auth_check)
        RETURNING
            id,
            fk_user_id    AS "userId",
            fk_project_id AS "projectId",
            version,
            last_event_id AS "lastEventId",
            created_at    AS "createdAt",
            updated_at    AS "updatedAt"
    `.execute(db);

    return result.rows;
};

export const deleteAllProjectMembers = async (projectId: string) => {
    await db
        .deleteFrom('projectMember')
        .where('fk_project_id', '=', projectId)
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
        .where('id', '=', projectId)
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
