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
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            LIMIT 1
        ),
        inserted_teams AS (
            INSERT INTO project_team (fk_project_id, name, created_at, fk_user_id)
            SELECT ${data.projectId}::uuid,
                   unnest(${data.teams}::text[]),
                   ${getTimeString()},
                   ${data.userId}
            WHERE EXISTS (SELECT 1 FROM auth_check)
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.team.created',
                   fk_project_id::text,
                   jsonb_build_object(
                       'projectId', fk_project_id,
                       'userId', fk_user_id,
                       'teamId', id,
                       'name', name
                   )
            FROM inserted_teams
        )
        SELECT
            id, name, fk_project_id AS "projectId", fk_user_id AS "createdBy", version, last_event_id AS "lastEventId", created_at AS "createdAt", updated_at AS "updatedAt"
        FROM inserted_teams
    `.execute(db);
    return added.rows;
};

export const deleteTeams = async (
    data: DeleteTeamsParam,
): Promise<string[]> => {
    const result = await sql<{ id: string }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
        ),
        deleted_teams AS (
            DELETE FROM project_team
            WHERE fk_project_id = ${data.projectId}::uuid
              AND id = ANY (${data.teamIds}::uuid[])
              AND (
                fk_user_id = ${data.userId}
                OR EXISTS (SELECT 1 FROM auth_check)
              )
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.team.deleted',
                   fk_project_id::text,
                   jsonb_build_object(
                       'projectId', fk_project_id,
                       'userId', ${data.userId}::text,
                       'teamId', id
                   )
            FROM deleted_teams
        )
        SELECT id FROM deleted_teams
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
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_team WHERE id = ${data.teamId}::uuid AND fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_team_member WHERE fk_team_id = ${data.teamId}::uuid AND fk_user_id = ${data.userId}
            LIMIT 1
        ),
        valid_users AS (
            SELECT id::text AS user_id
            FROM users
            WHERE id::text = ANY(${data.members}::text[])
        ),
        inserted_members AS (
            INSERT INTO project_team_member (fk_team_id, fk_user_id, fk_project_id)
            SELECT ${data.teamId}::uuid,
                   v.user_id,
                   ${data.projectId}::uuid
            FROM valid_users v
            WHERE EXISTS (SELECT 1 FROM auth_check)
              AND (
                EXISTS (SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = v.user_id)
                OR
                EXISTS (SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = v.user_id)
              )
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.team.member.added',
                   fk_project_id::text,
                   jsonb_build_object(
                       'projectId', fk_project_id,
                       'teamId', fk_team_id,
                       'userId', fk_user_id,
                       'actorId', ${data.userId}::text,
                       'memberId', id
                   )
            FROM inserted_members
        )
        SELECT
            id, fk_team_id AS "teamId", fk_user_id AS "userId", fk_project_id AS "projectId", version, last_event_id AS "lastEventId", created_at AS "createdAt", updated_at AS "updatedAt"
        FROM inserted_members
    `.execute(db);

    if (result.rows.length === 0)
        throw new Error(
            'Unauthorized, team not found, or members are not part of the project',
        );

    return result.rows;
};

export const deleteTeamMembers = async (
    data: DeleteTeamMembersParam,
): Promise<string[]> => {
    const result = await sql<{ userId: string }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_team WHERE id = ${data.teamId}::uuid AND fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
            UNION ALL
            SELECT 1 FROM project_team_member WHERE fk_team_id = ${data.teamId}::uuid AND fk_user_id = ${data.userId}
            LIMIT 1
        ),
        deleted_members AS (
            DELETE FROM project_team_member
            WHERE fk_team_id = ${data.teamId}::uuid
              AND fk_project_id = ${data.projectId}::uuid
              AND fk_user_id = ANY (${data.members}::text[])
              AND EXISTS (SELECT 1 FROM auth_check)
            RETURNING *
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'project.team.member.deleted',
                   fk_project_id::text,
                   jsonb_build_object(
                       'projectId', fk_project_id,
                       'teamId', fk_team_id,
                       'userId', fk_user_id,
                       'actorId', ${data.userId}::text,
                       'memberId', id
                   )
            FROM deleted_members
        )
        SELECT fk_user_id AS "userId" FROM deleted_members
    `.execute(db);
    if (result.rows.length !== data.members.length) {
        throw new Error('Unauthorized or some members not found');
    }
    return result.rows.map((r) => r.userId);
};

export const deleteAllProjectTeams = async (projectId: string) => {
    await db
        .deleteFrom('project_team')
        .where('fk_project_id', '=', sql`${projectId}::uuid` as any)
        .execute();
};

export const removeUserFromAllTeams = async (
    projectId: string,
    userId: string,
) => {
    await db
        .deleteFrom('project_team_member')
        .where('fk_project_id', '=', sql`${projectId}::uuid` as any)
        .where('fk_user_id', '=', userId)
        .execute();
};

export const deleteAllTeamMembers = async (
    projectId: string,
    teamId: string,
) => {
    await db
        .deleteFrom('project_team_member')
        .where('fk_project_id', '=', sql`${projectId}::uuid` as any)
        .where('fk_team_id', '=', sql`${teamId}::uuid` as any)
        .execute();
};

export const getTeams = async (
    userId: string,
    projectId: string,
    params: { cursor?: string; limit?: number } = {},
): Promise<{ teams: Team[]; nextCursor: string | null }> => {
    const limit = Math.min(params.limit ?? 20, 50);
    const cursor = params.cursor;

    const result = await sql<Team>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
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
    const teams = hasMore ? result.rows.slice(0, limit) : result.rows;
    const nextCursor = hasMore ? teams[teams.length - 1]!.id : null;

    return { teams, nextCursor };
};

export const getTeamMembers = async (
    userId: string,
    projectId: string,
    teamId: string,
    params: { cursor?: string; limit?: number } = {},
): Promise<{ members: TeamMember[]; nextCursor: string | null }> => {
    const limit = Math.min(params.limit ?? 20, 50);
    const cursor = params.cursor;

    const result = await sql<TeamMember>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
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
        WHERE fk_team_id = ${teamId}::uuid
          AND fk_project_id = ${projectId}::uuid
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

export const searchTeamUsers = async (params: {
    actorId: string;
    projectId: string;
    teamId: string;
    search?: string;
    cursor?: string;
    limit?: number;
}): Promise<{ users: { id: string; username: string; email: string }[]; nextCursor: string | null }> => {
    const search = params.search?.trim() ?? '';
    const cursor = params.cursor;
    const limit  = Math.min(params.limit ?? 20, 50);

    const cursorVal = params.cursor || null;

    const rows = await sql<{ id: string; username: string; email: string }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${params.projectId}::uuid AND fk_user_id = ${params.actorId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${params.projectId}::uuid AND fk_user_id = ${params.actorId}
            LIMIT 1
        )
        SELECT u.id, u.username, u.email
        FROM project_team_member tm
        JOIN users u ON u.id::text = tm.fk_user_id
        WHERE tm.fk_team_id    = ${params.teamId}::uuid
          AND tm.fk_project_id = ${params.projectId}::uuid
          AND EXISTS (SELECT 1 FROM auth_check)
          AND (
              ${search} = ''
              OR u.username = ${search}
              OR u.id::text = ${search}
          )
          AND (
              ${cursorVal}::uuid IS NULL
              OR u.id > ${cursorVal}::uuid
          )
        ORDER BY u.id
        LIMIT ${limit + 1}
    `.execute(db);

    const hasMore    = rows.rows.length > limit;
    const users      = hasMore ? rows.rows.slice(0, limit) : rows.rows;
    const nextCursor = hasMore ? users[users.length - 1]!.id : null;

    return { users, nextCursor };
};

export const getTeamsByIds = async (userId: string, teamIds: string[]): Promise<Team[]> => {
    if (teamIds.length === 0) return [];
    const result = await sql<Team>`
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
        WHERE id = ANY (${teamIds}::uuid[])
          AND (
              fk_user_id = ${userId}
              OR EXISTS (
                  SELECT 1 FROM project_member 
                  WHERE fk_project_id = project_team.fk_project_id 
                    AND fk_user_id = ${userId}
              )
              OR EXISTS (
                  SELECT 1 FROM project 
                  WHERE id = project_team.fk_project_id 
                    AND fk_user_id = ${userId}
              )
          )
    `.execute(db);
    return result.rows;
};
