import { db } from '../../../database';
import type {
    AddTeamMembersParam,
    CreateTeamsParam,
    DeleteTeamMembersParam,
    DeleteTeamsParam,
    Team,
    TeamMember,
} from '../TeamService.ts';
import { getTimeString } from '../../../utils/utils.ts';
import { sql } from 'kysely';

export const insertTeam = async (data: CreateTeamsParam): Promise<Team[]> => {
    const added = await sql<Team>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId} AND fk_user_id = ${data.userId}
        )
        INSERT INTO project_team (fk_project_id, name, created_at, fk_user_id)
        SELECT ${data.projectId},
               unnest(${data.teams}::text[]),
               ${getTimeString()},
               ${data.userId}
        WHERE EXISTS (SELECT 1 FROM auth_check)
        RETURNING
            id, name, fk_project_id AS "projectId", fk_user_id AS "createdBy", version, last_event_id AS "lastEventId", created_at AS "createdAt", updated_at AS "updatedAt"
    `.execute(db);
    return added.rows;
};

export const deleteTeams = async (
    data: DeleteTeamsParam,
): Promise<string[]> => {
    const result = await sql<{ id: string }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId} AND fk_user_id = ${data.userId}
        )
        DELETE
        FROM project_team
        WHERE fk_project_id = ${data.projectId}
          AND id = ANY (${data.teamIds}::text[])
          AND (
            fk_user_id = ${data.userId}
            OR EXISTS (SELECT 1 FROM auth_check)
          )
        RETURNING id
    `.execute(db);
    if (result.rows.length !== data.teamIds.length) {
        throw new Error('Unauthorized or some teams not found');
    }
    return result.rows.map((r) => r.id);
};

export const insertTeamMembers = async (
    data: AddTeamMembersParam,
): Promise<TeamMember[]> => {
    const result = await sql<TeamMember>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId} AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_team WHERE id = ${data.teamId} AND fk_project_id = ${data.projectId} AND fk_user_id = ${data.userId}
            LIMIT 1
        )
        INSERT INTO project_team_member (fk_team_id, fk_user_id, fk_project_id)
        SELECT ${data.teamId},
               unnest(${data.members}::text[]),
               ${data.projectId}
        WHERE EXISTS (SELECT 1 FROM auth_check)
        RETURNING
            id, fk_team_id AS "teamId", fk_user_id AS "userId", fk_project_id AS "projectId", version, last_event_id AS "lastEventId", created_at AS "createdAt", updated_at AS "updatedAt"
    `.execute(db);
    if (result.rows.length === 0)
        throw new Error('Unauthorized or team not found');
    return result.rows;
};

export const deleteTeamMembers = async (
    data: DeleteTeamMembersParam,
): Promise<string[]> => {
    const result = await sql<{ userId: string }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId} AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_team WHERE id = ${data.teamId} AND fk_project_id = ${data.projectId} AND fk_user_id = ${data.userId}
            LIMIT 1
        )
        DELETE
        FROM project_team_member
        WHERE fk_team_id = ${data.teamId}
          AND fk_project_id = ${data.projectId}
          AND fk_user_id = ANY (${data.members}::text[])
          AND EXISTS (SELECT 1 FROM auth_check)
        RETURNING fk_user_id AS "userId"
    `.execute(db);
    if (result.rows.length !== data.members.length) {
        throw new Error('Unauthorized or some members not found');
    }
    return result.rows.map((r) => r.userId);
};

export const deleteAllProjectTeams = async (projectId: string) => {
    await db
        .deleteFrom('projectTeam')
        .where('fk_project_id', '=', projectId)
        .execute();
};

export const removeUserFromAllTeams = async (
    projectId: string,
    userId: string,
) => {
    await db
        .deleteFrom('projectTeamMember')
        .where('fk_project_id', '=', projectId)
        .where('fk_user_id', '=', userId)
        .execute();
};

export const deleteAllTeamMembers = async (
    projectId: string,
    teamId: string,
) => {
    await db
        .deleteFrom('projectTeamMember')
        .where('fk_project_id', '=', projectId)
        .where('fk_team_id', '=', teamId)
        .execute();
};

export const getTeams = async (
    userId: string,
    projectId: string,
): Promise<Team[]> => {
    const result = await sql<Team>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId} AND fk_user_id = ${userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId} AND fk_user_id = ${userId}
            LIMIT 1
        )
        SELECT 
            id, 
            name, 
            fk_project_id AS "projectId", 
            fk_user_id AS "createdBy", 
            version, 
            last_event_id AS "lastEventId", 
            created_at AS "createdAt", 
            updated_at AS "updatedAt"
        FROM project_team
        WHERE fk_project_id = ${projectId}
          AND EXISTS (SELECT 1 FROM auth_check)
    `.execute(db);
    return result.rows;
};

export const getTeamMembers = async (
    userId: string,
    projectId: string,
    teamId: string,
): Promise<TeamMember[]> => {
    const result = await sql<TeamMember>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId} AND fk_user_id = ${userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId} AND fk_user_id = ${userId}
            LIMIT 1
        )
        SELECT 
            id, 
            fk_team_id AS "teamId", 
            fk_user_id AS "userId", 
            fk_project_id AS "projectId", 
            version, 
            last_event_id AS "lastEventId", 
            created_at AS "createdAt", 
            updated_at AS "updatedAt"
        FROM project_team_member
        WHERE fk_team_id = ${teamId}
          AND fk_project_id = ${projectId}
          AND EXISTS (SELECT 1 FROM auth_check)
    `.execute(db);
    return result.rows;
};
