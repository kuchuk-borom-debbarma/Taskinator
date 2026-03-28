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
        INSERT INTO project_team (fk_project_id, name, created_at, fk_user_id)
        SELECT ${data.projectId},
               unnest(${data.teams}::text[]),
               ${getTimeString()},
               ${data.userId} WHERE EXISTS (
            SELECT 1 FROM project
            WHERE id = ${data.projectId}
            AND fk_user_id = ${data.userId}
            )
            RETURNING
            id, name, fk_project_id AS "projectId", fk_user_id AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
    `.execute(db);
    return added.rows;
};

export const deleteTeams = async (
    data: DeleteTeamsParam,
): Promise<string[]> => {
    /*
     * Delete teams by ID scoped to the project.
     * Auth rule: userId must be either the project owner (EXISTS check)
     * or the creator of the team (fk_user_id check) to delete.
     * If neither condition is met, the WHERE clause matches no rows,
     * and the length check below will throw Unauthorized.
     */
    const result = await sql<{ id: string }>`
        DELETE
        FROM project_team
        WHERE fk_project_id = ${data.projectId}
          AND id = ANY (${data.teamIds}::text[])
          AND (
            fk_user_id = ${data.userId}
                OR EXISTS (SELECT 1
                           FROM project
                           WHERE id = ${data.projectId}
                             AND fk_user_id = ${data.userId})
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
    /*
     * Insert members into a team scoped to the project.
     * Auth rule: userId must be either the project owner (project EXISTS check)
     * or the creator of the team (team EXISTS check) to add members.
     * If neither condition is met, WHERE EXISTS returns no rows
     * and the length check below will throw Unauthorized.
     */
    const result = await sql<TeamMember>`
        INSERT INTO project_team_member (fk_team_id, fk_user_id, fk_project_id)
        SELECT ${data.teamId},
               unnest(${data.members}::text[]),
               ${data.projectId} WHERE EXISTS (
            SELECT 1 FROM project_team
            WHERE id = ${data.teamId}
            AND fk_project_id = ${data.projectId}
            AND (
            fk_user_id = ${data.userId}
            OR EXISTS (
            SELECT 1 FROM project
            WHERE id = ${data.projectId}
            AND fk_user_id = ${data.userId}
            )
            )
            )
            RETURNING
            id, fk_team_id AS "teamId", fk_user_id AS "userId", fk_project_id AS "projectId", created_at AS "createdAt", updated_at AS "updatedAt"
    `.execute(db);
    if (result.rows.length === 0)
        throw new Error('Unauthorized or team not found');
    return result.rows;
};

export const deleteTeamMembers = async (
    data: DeleteTeamMembersParam,
): Promise<string[]> => {
    /*
     * Delete members from a team scoped to the project.
     * Auth rule: userId must be either the project owner (project EXISTS check)
     * or the creator of the team (project_team EXISTS check) to delete members.
     * If neither condition is met, WHERE clause matches no rows
     * and an empty array is returned.
     */
    const result = await sql<{ userId: string }>`
        DELETE
        FROM project_team_member
        WHERE fk_team_id = ${data.teamId}
          AND fk_project_id = ${data.projectId}
          AND fk_user_id = ANY (${data.members}::text[])
          AND (
            EXISTS (SELECT 1
                    FROM project
                    WHERE id = ${data.projectId}
                      AND fk_user_id = ${data.userId})
                OR EXISTS (SELECT 1
                           FROM project_team
                           WHERE id = ${data.teamId}
                             AND fk_project_id = ${data.projectId}
                             AND fk_user_id = ${data.userId})
            )
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

export const removeUserFromAllTeams = async (projectId: string, userId: string) => {
    await db
        .deleteFrom('projectTeamMember')
        .where('fk_project_id', '=', projectId)
        .where('fk_user_id', '=', userId)
        .execute();
};

export const deleteAllTeamMembers = async (projectId: string, teamId: string) => {
    await db
        .deleteFrom('projectTeamMember')
        .where('fk_project_id', '=', projectId)
        .where('fk_team_id', '=', teamId)
        .execute();
};
