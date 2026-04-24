import { sql, type Transaction } from 'kysely';
import { type Database, db } from '../../../database';
import { ConflictError, NotFoundError } from '../../../graphql/errors.ts';
import type { PaginationParams } from '../../../types/pagination.ts';
import { decodeCursor, encodeCursor } from '../../../utils/utils.ts';
import type { User } from '../../auth/AuthService.ts';
import type { Team, TeamMember } from '../TeamService.ts';

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
            RETURNING id, name, fk_project_id AS "projectId", fk_user_id AS "createdBy", version, created_at AS "createdAt", updated_at AS "updatedAt", members_count AS "membersCount", tasks_count AS "tasksCount"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'team-events',
                "projectId"::text,
                jsonb_build_object(
                    'type', 'team.created'::text,
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
            t.created_at AS "createdAt", 
            t.created_at::text as "epochPrecision",
            t.updated_at AS "updatedAt",
            t.members_count AS "membersCount",
            t.tasks_count AS "tasksCount"
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
            created_at AS "createdAt", 
            updated_at AS "updatedAt",
            members_count AS "membersCount",
            tasks_count AS "tasksCount"
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
            created_at AS "createdAt", 
            updated_at AS "updatedAt",
            members_count AS "membersCount",
            tasks_count AS "tasksCount"
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
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${param.projectId}::uuid AND fk_user_id = ${param.actorId}::text
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
                'team-events',
                id::text,
                jsonb_build_object(
                    'type', 'team.deleted'::text,
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
        valid_team AS (
            SELECT 1 FROM project_team WHERE id = ${param.teamId}::uuid AND fk_project_id = ${param.projectId}::uuid
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
              AND EXISTS (SELECT 1 FROM valid_team)
            ON CONFLICT DO NOTHING
            RETURNING fk_user_id
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'team-events',
                ${param.teamId}::text,
                jsonb_build_object(
                    'type', 'team.members_added'::text,
                    'teamId', ${param.teamId}::uuid,
                    'projectId', ${param.projectId}::uuid,
                    'addedUserIds', array_agg(fk_user_id)
                )
            FROM inserted_members
            GROUP BY 1
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
                'team-events',
                ${param.teamId}::text,
                jsonb_build_object(
                    'type', 'team.members_removed'::text,
                    'teamId', ${param.teamId}::uuid,
                    'projectId', ${param.projectId}::uuid,
                    'removedUserIds', array_agg(fk_user_id)
                )
            FROM deleted_members
            GROUP BY 1
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
                      version, created_at AS "createdAt", updated_at AS "updatedAt",
                      members_count AS "membersCount", tasks_count AS "tasksCount"
        ),
        inserted_outbox AS (
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 
                'team-events',
                id::text,
                jsonb_build_object(
                    'type', 'team.updated'::text,
                    'teamId', id,
                    'projectId', "projectId",
                    'name', name,
                    'version', version,
                    'actorId', ${param.actorId}::text
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

export const updateTeamMemberCountsBulk = async (
    updates: Map<string, number>,
): Promise<void> => {
    const entries = Array.from(updates.entries());
    if (entries.length === 0) return;

    const ids = entries.map(([id]) => id);
    const deltas = entries.map(([_, delta]) => delta);

    await sql`
        UPDATE project_team SET 
            members_count = project_team.members_count + v.delta,
            updated_at = NOW()
        FROM (
            SELECT * FROM UNNEST(${ids}::uuid[], ${deltas}::int[])
        ) AS v(id, delta)
        WHERE project_team.id = v.id
    `.execute(db);
};

/**
 * Batch removes members from project teams across multiple projects.
 * Also performs bulk counter repair for affected teams.
 */
/**
 * Batch removes members from project teams across multiple projects.
 * This is a consolidated action that also performs the counter repair.
 * [Action]: REMOVE_PROJECT_TEAM_MEMBER
 */
export const removeProjectTeamMembersBatch = async (
    deltas: { projectId: string; userIds: string[] }[],
    trx?: Transaction<Database>,
): Promise<{ affectedProjectCount: number; affectedTeamCount: number }> => {
    if (deltas.length === 0)
        return { affectedProjectCount: 0, affectedTeamCount: 0 };

    const projectIds = deltas.map((d) => d.projectId);
    const userIdsList = deltas.map((d) => d.userIds);

    // 1. Purge members and identify affected teams using RETURNING
    const affectedTeams = await sql<{ teamId: string }>`
        DELETE FROM project_team_member
        USING (
            SELECT unnest(${projectIds}::uuid[]) as pid, unnest(${userIdsList}::text[][]) as uids
        ) AS V
        WHERE project_team_member.fk_project_id = V.pid
          AND project_team_member.fk_user_id = ANY(V.uids)
        RETURNING project_team_member.fk_team_id AS "teamId"
    `.execute(trx || db);

    if (affectedTeams.rows.length === 0) {
        return { affectedProjectCount: deltas.length, affectedTeamCount: 0 };
    }

    // 2. Aggregate deltas for Counter Repair
    const teamDeltas = new Map<string, number>();
    for (const row of affectedTeams.rows) {
        teamDeltas.set(row.teamId, (teamDeltas.get(row.teamId) || 0) - 1);
    }

    // 3. Perform atomic counter update within the SAME transaction
    await incrementTeamMemberCountsBulk(trx || db, teamDeltas);

    return {
        affectedProjectCount: deltas.length,
        affectedTeamCount: teamDeltas.size,
    };
};

export async function updateTeamTaskCountsBulk(
    updates: Map<string, number>,
    trx?: Transaction<Database>,
): Promise<void> {
    const entries = Array.from(updates.entries());
    if (entries.length === 0) return;

    const ids = entries.map(([id]) => id);
    const deltas = entries.map(([, delta]) => delta);

    await sql`
        UPDATE project_team SET 
            tasks_count = project_team.tasks_count + v.delta,
            updated_at = NOW()
        FROM (
            SELECT * FROM UNNEST(${ids}::uuid[], ${deltas}::int[])
        ) AS v(id, delta)
        WHERE project_team.id = v.id
    `.execute(trx || db);
}

/**
 * Bulk decommissions team membership records for specified projects.
 * [Action]: DELETE_PROJECT_TEAM_MEMBER
 */
export async function deleteProjectTeamMemberBatch(
    projectIds: string[],
    trx?: Transaction<Database>,
): Promise<{ affectedCount: number }> {
    if (projectIds.length === 0) return { affectedCount: 0 };

    const result = await (trx || db)
        .deleteFrom('project_team_member')
        .where('fk_project_id', 'in', projectIds)
        .executeTakeFirst();

    return { affectedCount: Number(result.numDeletedRows) };
}

/**
 * Bulk decommissions team entities for specified projects.
 * [Action]: DELETE_PROJECT_TEAM
 */
export async function deleteProjectTeamBatch(
    projectIds: string[],
    trx?: Transaction<Database>,
): Promise<{ affectedCount: number }> {
    if (projectIds.length === 0) return { affectedCount: 0 };

    const result = await (trx || db)
        .deleteFrom('project_team')
        .where('fk_project_id', 'in', projectIds)
        .executeTakeFirst();

    return { affectedCount: Number(result.numDeletedRows) };
}

/**
 * Bulk repair of Team Member counts.
 */
export async function incrementTeamMemberCountsBulk(
    trx: any,
    deltas: Map<string, number>,
): Promise<void> {
    const entries = Array.from(deltas.entries());
    if (entries.length === 0) return;

    const teamIds = entries.map(([tid]) => tid);
    const deltaList = entries.map(([, d]) => d);

    await sql`
        UPDATE project_team SET 
            members_count = project_team.members_count + v.delta,
            updated_at = NOW()
        FROM (
            SELECT * FROM UNNEST(${teamIds}::uuid[], ${deltaList}::int[])
        ) AS v(tid, delta)
        WHERE project_team.id = v.tid
    `.execute(trx || db);
}

/**
 * Bulk repair of Project Team counts.
 */
export async function incrementProjectTeamCountsBulk(
    trx: any,
    deltas: Map<string, number>,
): Promise<void> {
    const entries = Array.from(deltas.entries());
    if (entries.length === 0) return;

    const projectIds = entries.map(([pid]) => pid);
    const deltaList = entries.map(([, d]) => d);

    await sql`
        UPDATE project SET 
            teams_count = project.teams_count + v.delta,
            updated_at = NOW()
        FROM (
            SELECT * FROM UNNEST(${projectIds}::uuid[], ${deltaList}::int[])
        ) AS v(pid, delta)
        WHERE project.id = v.pid
    `.execute(trx || db);
}

/**
 * Bulk purge of team memberships.
 * [Action]: PURGE_TEAM_MEMBERSHIPS
 */
export async function purgeTeamMembershipsByTeamIdsBatch(
    teamIds: string[],
    trx?: any,
): Promise<{ affectedCount: number }> {
    if (teamIds.length === 0) return { affectedCount: 0 };

    const result = await (trx || db)
        .deleteFrom('project_team_member')
        .where('fk_team_id', 'in', teamIds)
        .executeTakeFirst();

    return { affectedCount: Number(result.numDeletedRows) };
}
