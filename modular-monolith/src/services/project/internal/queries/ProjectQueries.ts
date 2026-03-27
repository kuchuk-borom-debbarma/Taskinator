import type {
    CreateProjectParam,
    Project,
    ProjectMember,
} from '../../ProjectService.ts';
import {db} from "../../../../database";

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
        .execute();

    if (added.length > 0) {
        const inserted = added[0];
        if (!inserted) return null;
        return {
            createdAt: inserted.created_at,
            description: inserted.description,
            id: inserted.id,
            name: inserted.name,
            updatedAt: inserted.updated_at,
            userId: inserted.fk_user_id,
        };
    }

    return null;
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
        description: p.description,
        createdAt: p.created_at,
    }));
};

export const insertProjectMembers = async (data: {
    userId: string;
    projectId: string;
    usersToAdd: string[];
}): Promise<ProjectMember[]> => {
    //Validate project owner before inserting.
    const added = await db
        .with('owner_check', (db) =>
            db
                .selectFrom('project')
                .where('id', '=', data.projectId)
                .where('fk_user_id', '=', data.userId)
                .select('id'),
        )
        .insertInto('projectMember')
        .values(
            data.usersToAdd.map((u) => ({
                fk_user_id: u,
                fk_project_id: data.projectId,
            })),
        )
        .returningAll()
        .execute();
    //  If owner_check returns no rows, Postgres skips the insert entirely
    //  and returns [], so check for unauthorized after
    if (added.length === 0) throw new Error('Unauthorized or no members added');

    return added.map((value) => ({
        createdAt: value.created_at,
        id: value.id,
        projectId: value.fk_project_id,
        updatedAt: value.updated_at,
        userId: value.fk_user_id,
    }));
};

export const deleteProjects = async (data: {
    userId: string;
    projectIds: string[];
}) => {
    const deleted = await db
        .deleteFrom('project')
        .where('id', 'in', data.projectIds)
        .where('fk_user_id', '=', data.userId) // only deletes rows user owns
        .returningAll()
        .execute();

    // check all requested ids were actually deleted
    if (deleted.length !== data.projectIds.length) {
        throw new Error('Unauthorized or some projects not found');
    }

    return deleted.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        userId: p.fk_user_id,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
    }));
};

export const deleteProjectMembers = async (data: {
    userId: string;
    projectId: string;
    memberIds: string[];
}) => {
    const deleted = await db
        .with('owner_check', (db) =>
            db
                .selectFrom('project')
                .where('id', '=', data.projectId)
                .where('fk_user_id', '=', data.userId)
                .select('id'),
        )
        .deleteFrom('projectMember')
        .where('fk_project_id', '=', data.projectId)
        .where('id', 'in', data.memberIds)
        .where(({ exists, selectFrom }) =>
            exists(selectFrom('owner_check').select('id')),
        )
        .returningAll()
        .execute();

    if (deleted.length !== data.memberIds.length) {
        throw new Error('Unauthorized or some members not found');
    }

    return deleted.map((value) => ({
        id: value.id,
        userId: value.fk_user_id,
        projectId: value.fk_project_id,
        createdAt: value.created_at,
        updatedAt: value.updated_at,
    }));
};
