import type { Team, TeamMember } from '../TeamService.ts';
import { db } from '../../../database';
import { decodeCursor, encodeCursor } from '../../../utils/utils.ts';
import { sql } from 'kysely';
import type { PaginationParams } from '../../../types/pagination.ts';
import type { User } from '../../auth/AuthService.ts';
import { NotFoundError, ConflictError } from '../../../graphql/errors.ts';

export const insertTeam = async (param: {
    actorId: string;
    projectId: string;
    name: string;
}): Promise<Team> => {
    const result = await sql<Team>`
        WITH authorized AS (
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            LIMIT 1
        ),
        inserted_team AS (
            INSERT INTO project_team (name, fk_project_id, fk_user_id)
            SELECT ${param.name}, ${param.projectId}::uuid, ${param.actorId}
            WHERE EXISTS (SELECT 1 FROM authorized)
            RETURNING id, name, fk_project_id AS "projectId", fk_user_id AS "createdBy", version, last_event_id AS "lastEventId", created_at AS "createdAt", updated_at AS "updatedAt"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'team.created',
                "projectId"::text,
                jsonb_build_object(
                    'teamId', id,
                    'projectId', "projectId",
                    'name', name,
                    'createdBy', "createdBy"
                )
            FROM inserted_team
        )
        SELECT * FROM inserted_team
    `.execute(db);

    const team = result.rows[0];
    if (!team) {
        throw new NotFoundError(
            `Project with ID ${param.projectId} not found or you are not authorized to create a team in it.`,
        );
    }

    return team;
};

export const getTeams = async (
    userId: string,
    projectId: string | null,
    params: PaginationParams & { memberId?: string } = {},
): Promise<{
    teams: Team[];
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
    const limit = Math.min(params.first || params.last || 10, 50);
    const { after, before, memberId } = params;
    const isBackward = !!before;
    const cursor = before || after;

    let cursorEpoch: string | null = null;
    let cursorId: string | null = null;

    if (cursor) {
        const decoded = decodeCursor(cursor);
        cursorEpoch = decoded.timeValue;
        cursorId = decoded.id;
    }

    const result = await sql<Team & { epochPrecision: string }>`
        WITH auth_check AS (
            SELECT 1 WHERE ${projectId}::text IS NULL AND ${memberId ?? null}::text IS NOT NULL
            UNION ALL
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            LIMIT 1
        )
        SELECT 
            t.id, 
            t.name, 
            t.fk_project_id AS "projectId", 
            t.fk_user_id AS "createdBy", 
            t.version, 
            t.last_event_id AS "lastEventId", 
            t.created_at AS "createdAt", 
            t.created_at::text as "epochPrecision",
            t.updated_at AS "updatedAt"
        FROM project_team t
        WHERE EXISTS (SELECT 1 FROM auth_check)
          AND (
            (${projectId}::uuid IS NULL AND EXISTS (SELECT 1 FROM project_team_member ptm WHERE ptm.fk_team_id = t.id AND ptm.fk_user_id = ${memberId}))
            OR (t.fk_project_id = ${projectId}::uuid)
          )
          AND (
            ${memberId ?? null}::text IS NULL OR EXISTS (SELECT 1 FROM project_team_member ptm WHERE ptm.fk_team_id = t.id AND ptm.fk_user_id = ${memberId})
          )
          AND (
            ${cursorEpoch}::text IS NULL
            OR (
                CASE 
                  WHEN ${isBackward} THEN (t.created_at > ${cursorEpoch}::timestamptz OR (t.created_at = ${cursorEpoch}::timestamptz AND t.id > ${cursorId}::uuid))
                  ELSE (t.created_at < ${cursorEpoch}::timestamptz OR (t.created_at = ${cursorEpoch}::timestamptz AND t.id < ${cursorId}::uuid))
                END
            )
          )
        ORDER BY t.created_at ${sql.raw(isBackward ? 'ASC' : 'DESC')}, t.id ${sql.raw(isBackward ? 'ASC' : 'DESC')}
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

    const teams = rows;
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (teams.length > 0) {
        const first = teams[0]!;
        const last = teams[teams.length - 1]!;
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

    return { teams, nextCursor, prevCursor };
};

export const getTeamMembers = async (
    userId: string,
    projectId: string,
    teamId: string,
    params: PaginationParams = {},
): Promise<{
    members: TeamMember[];
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

    const result = await sql<TeamMember & { epochPrecision: string }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            LIMIT 1
        )
        SELECT 
            id, 
            fk_project_id AS "projectId", 
            fk_team_id AS "teamId", 
            fk_user_id AS "userId", 
            version, 
            last_event_id AS "lastEventId", 
            created_at AS "createdAt", 
            created_at::text as "epochPrecision",
            updated_at AS "updatedAt"
        FROM project_team_member
        WHERE fk_team_id = ${teamId}::uuid
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

export const searchTeamUsers = async (
    params: {
        actorId: string;
        projectId: string;
        teamId: string;
        search?: string;
    } & PaginationParams,
): Promise<{
    users: User[];
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
    const search = params.search?.trim() ?? '';
    const { after, before } = params;
    const isBackward = !!before;
    const cursor = before || after;
    const limit = Math.min(params.first || params.last || 5, 50);

    let cursorEpoch: string | null = null;
    let cursorId: string | null = null;

    if (cursor) {
        const decoded = decodeCursor(cursor);
        cursorEpoch = decoded.timeValue;
        cursorId = decoded.id;
    }

    const rows = await sql<User & { epochPrecision: string }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${params.projectId}::uuid AND fk_user_id = ${params.actorId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${params.projectId}::uuid AND fk_user_id = ${params.actorId}
            LIMIT 1
        ),
        team_users AS (
            SELECT u.id, u.username, u.email, ptm.created_at
            FROM project_team_member ptm
            JOIN users u ON u.id::text = ptm.fk_user_id
            WHERE ptm.fk_team_id = ${params.teamId}::uuid
        )
        SELECT 
            id, username, email,
            created_at AS "createdAt",
            created_at::text as "epochPrecision"
        FROM team_users
        WHERE EXISTS (SELECT 1 FROM auth_check)
          AND (
            ${search} = ''
            OR username ILIKE '%' || ${search} || '%'
            OR id::text = ${search}
          )
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

    return { users, nextCursor, prevCursor };
};

export const getTeamsByIds = async (teamIds: string[]): Promise<Team[]> => {
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
        WHERE id = ANY(${teamIds}::uuid[])
    `.execute(db);

    return result.rows;
};

export const getTeamsByActorIdAndIds = async (
    actorId: string,
    teamIds: string[],
): Promise<Team[]> => {
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
        WHERE id = ANY(${teamIds}::uuid[])
          AND EXISTS (
              SELECT 1 FROM project p 
              LEFT JOIN project_member pm ON pm.fk_project_id = p.id
              WHERE p.id = project_team.fk_project_id
                AND (p.fk_user_id = ${actorId}::text OR pm.fk_user_id = ${actorId}::text)
          )
    `.execute(db);

    return result.rows;
};
export const deleteTeams = async (param: {
    actorId: string;
    projectId: string;
    teamIds: string[];
}): Promise<{ deletedCount: number }> => {
    const ids = param.teamIds.slice(0, 1000); // Batch protection
    if (ids.length === 0) return { deletedCount: 0 };

    const result = await sql<{ deletedCount: string }>`
        WITH authorized AS (
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            LIMIT 1
        ),
        deleted_teams AS (
            DELETE FROM project_team
            WHERE id = ANY(${ids}::uuid[])
              AND fk_project_id = ${param.projectId}::uuid
              AND EXISTS (SELECT 1 FROM authorized)
            RETURNING id, name, fk_project_id AS "projectId"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'team.deleted',
                id::text,
                jsonb_build_object(
                    'teamId', id,
                    'projectId', "projectId",
                    'name', name
                )
            FROM deleted_teams
        )
        SELECT COUNT(*)::text AS "deletedCount" FROM deleted_teams
    `.execute(db);

    const deletedCount = parseInt(result.rows[0]?.deletedCount ?? '0', 10);
    return { deletedCount };
};

export const insertTeamMembers = async (param: {
    actorId: string;
    projectId: string;
    teamId: string;
    userIds: string[];
}): Promise<{ addedCount: number }> => {
    const ids = param.userIds.slice(0, 1000);
    if (ids.length === 0) return { addedCount: 0 };

    const result = await sql<{ addedCount: string }>`
        WITH authorized AS (
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            LIMIT 1
        ),
        valid_users AS (
            SELECT fk_user_id 
            FROM project_member 
            WHERE fk_project_id = ${param.projectId}::uuid 
              AND fk_user_id = ANY(${ids}::text[])
        ),
        inserted_members AS (
            INSERT INTO project_team_member (fk_team_id, fk_project_id, fk_user_id)
            SELECT ${param.teamId}::uuid, ${param.projectId}::uuid, vu.fk_user_id
            FROM valid_users vu
            WHERE EXISTS (SELECT 1 FROM authorized)
            ON CONFLICT DO NOTHING
            RETURNING fk_user_id
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'team.members_added',
                ${param.teamId},
                jsonb_build_object(
                    'teamId', ${param.teamId},
                    'projectId', ${param.projectId},
                    'addedUserIds', (SELECT json_agg(fk_user_id) FROM inserted_members)
                )
            WHERE EXISTS (SELECT 1 FROM inserted_members)
        )
        SELECT COUNT(*)::text AS "addedCount" FROM inserted_members
    `.execute(db);

    const addedCount = parseInt(result.rows[0]?.addedCount ?? '0', 10);
    if (addedCount === 0 && ids.length > 0) {
        // Double check if team exists or if it was auth failure
        const team = await getTeamsByIds([param.teamId]);
        if (!team[0]) throw new NotFoundError('Team not found');
        // If team exists but 0 added, it could be auth failure OR users already in team
    }

    return { addedCount };
};

export const deleteTeamMembers = async (param: {
    actorId: string;
    projectId: string;
    teamId: string;
    userIds: string[];
}): Promise<{ removedCount: number }> => {
    const ids = param.userIds.slice(0, 1000);
    if (ids.length === 0) return { removedCount: 0 };

    const result = await sql<{ removedCount: string }>`
        WITH authorized AS (
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            LIMIT 1
        ),
        deleted_members AS (
            DELETE FROM project_team_member
            WHERE fk_team_id = ${param.teamId}::uuid
              AND fk_user_id = ANY(${ids}::text[])
              AND EXISTS (SELECT 1 FROM authorized)
            RETURNING fk_user_id
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'team.members_removed',
                ${param.teamId},
                jsonb_build_object(
                    'teamId', ${param.teamId},
                    'projectId', ${param.projectId},
                    'removedUserIds', (SELECT json_agg(fk_user_id) FROM deleted_members)
                )
            WHERE EXISTS (SELECT 1 FROM deleted_members)
        )
        SELECT COUNT(*)::text AS "removedCount" FROM deleted_members
    `.execute(db);

    const removedCount = parseInt(result.rows[0]?.removedCount ?? '0', 10);
    return { removedCount };
};

export const updateTeam = async (param: {
    actorId: string;
    projectId: string;
    teamId: string;
    name: string;
    version: number;
}): Promise<Team> => {
    const result = await sql<Team>`
        WITH authorized AS (
            SELECT 1 FROM project WHERE id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
            LIMIT 1
        ),
        updated AS (
            UPDATE project_team
            SET 
                name = ${param.name},
                version = version + 1,
                updated_at = NOW()
            WHERE id = ${param.teamId}::uuid
              AND fk_project_id = ${param.projectId}::uuid
              AND version = ${param.version}
              AND EXISTS (SELECT 1 FROM authorized)
            RETURNING id, name, fk_project_id AS "projectId", fk_user_id AS "createdBy", 
                      version, last_event_id AS "lastEventId", created_at AS "createdAt", updated_at AS "updatedAt"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'team.updated',
                id::text,
                jsonb_build_object(
                    'teamId', id,
                    'projectId', projectId,
                    'name', name,
                    'version', version,
                    'actorId', ${param.actorId}
                )
            FROM updated
        )
        SELECT * FROM updated
    `.execute(db);

    const team = result.rows[0];
    if (!team) {
        // Distinguish between Not Found / Unauthorized vs Version Conflict
        const currentTeamResult = await sql<{ version: number }>`
            SELECT version FROM project_team WHERE id = ${param.teamId}::uuid
        `.execute(db);

        const currentTeam = currentTeamResult.rows[0];
        if (!currentTeam) {
            throw new NotFoundError(
                `Team with ID ${param.teamId} not found or you are not authorized.`,
            );
        }

        if (currentTeam.version !== param.version) {
            throw new ConflictError(
                `Team version mismatch. Current version is ${currentTeam.version}, but you provided ${param.version}.`,
            );
        }

        // If version matches but update failed, it was probably authorization
        throw new NotFoundError(
            `Team with ID ${param.teamId} not found or you are not authorized to update it.`,
        );
    }

    return team;
};

export const deleteTeamsByProjectIds = async (
    projectIds: string[],
): Promise<{ deletedCount: number }> => {
    if (projectIds.length === 0) return { deletedCount: 0 };

    const result = await sql<{ deletedCount: string }>`
        DELETE FROM project_team
        WHERE fk_project_id = ANY(${projectIds}::uuid[])
        RETURNING id
    `.execute(db);

    return { deletedCount: result.rows.length };
};

export const deleteProjectTeamMembersByProjectIds = async (
    projectIds: string[],
): Promise<{ deletedCount: number }> => {
    if (projectIds.length === 0) return { deletedCount: 0 };

    const result = await sql<{ id: string }>`
        DELETE FROM project_team_member
        WHERE fk_project_id = ANY(${projectIds}::uuid[])
        RETURNING id
    `.execute(db);

    return { deletedCount: result.rows.length };
};
