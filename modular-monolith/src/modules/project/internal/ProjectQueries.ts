import type {
    Project,
    ProjectMember,
} from '../ProjectService.ts';
import { db } from '../../../database';
import {
    decodeCursor,
    encodeCursor,
} from '../../../utils/utils.ts';
import { sql } from 'kysely';

export const getProjects = async (
    userId: string,
    params: {
        first?: number;
        after?: string;
        last?: number;
        before?: string;
    } = {},
): Promise<{
    projects: Project[];
    nextCursor: string | null;
    prevCursor: string | null;
}> => {
    const limit = Math.min(params.first || params.last || 5, 50);
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

    const result = await sql<
        Project & { isOwner: boolean; epochPrecision: string }
    >`
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
            created_at::text as "epochPrecision",
            updated_at AS "updatedAt",
            is_owner AS "isOwner"
        FROM combined_projects
        WHERE (
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

    const projects = rows;
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (projects.length > 0) {
        const first = projects[0]!;
        const last = projects[projects.length - 1]!;
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
    params: {
        first?: number;
        after?: string;
        last?: number;
        before?: string;
    } = {},
): Promise<{
    members: ProjectMember[];
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

    const result = await sql<ProjectMember & { epochPrecision: string }>`
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
            created_at::text as "epochPrecision",
            updated_at AS "updatedAt"
        FROM project_member
        WHERE fk_project_id = ${projectId}::uuid
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

export const getProjectMembersByIds = async (
    userId: string,
    memberIds: string[],
): Promise<ProjectMember[]> => {
    if (memberIds.length === 0) return [];

    const result = await sql<ProjectMember>`
        SELECT 
            pm.id, 
            pm.fk_user_id AS "userId", 
            pm.fk_project_id AS "projectId", 
            pm.version, 
            pm.last_event_id AS "lastEventId", 
            pm.created_at AS "createdAt", 
            pm.updated_at AS "updatedAt"
        FROM project_member pm
        WHERE pm.id = ANY(${memberIds}::uuid[])
          AND EXISTS (
              -- Authorization: actor must be a member of the projects they are requesting member info for
              -- OR owner of the project
              SELECT 1 FROM project p 
              LEFT JOIN project_member pm2 ON pm2.fk_project_id = p.id
              WHERE p.id = pm.fk_project_id
                AND (p.fk_user_id = ${userId}::text OR pm2.fk_user_id = ${userId}::text)
          )
    `.execute(db);

    return result.rows;
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
    users: {
        id: string;
        username: string;
        email: string;
        epochPrecision: string;
    }[];
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

    const rows = await sql<{
        id: string;
        username: string;
        email: string;
        epochPrecision: string;
    }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${params.projectId}::uuid AND fk_user_id = ${params.actorId}
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${params.projectId}::uuid AND fk_user_id = ${params.actorId}
            LIMIT 1
        ),
        project_owner AS (
            SELECT u.id, u.username, u.email, p.created_at
            FROM project p
            JOIN users u ON u.id::text = p.fk_user_id
            WHERE p.id = ${params.projectId}::uuid
        ),
        project_members AS (
            SELECT u.id, u.username, u.email, pm.created_at
            FROM project_member pm
            JOIN users u ON u.id::text = pm.fk_user_id
            WHERE pm.fk_project_id = ${params.projectId}::uuid
        ),
        all_eligible_users AS (
            SELECT * FROM project_owner
            UNION
            SELECT * FROM project_members
        )
        SELECT 
            id, username, email,
            created_at::text as "epochPrecision"
        FROM all_eligible_users
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
        const firstEpoch = first.epochPrecision;
        const lastEpoch = last.epochPrecision;

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

export const getProjectStats = async (
    userId: string,
    projectId: string,
): Promise<{
    teamCount: number;
    taskCount: number;
    memberCount: number;
    taskLabelCounts: { label: string; count: number }[];
}> => {
    const result = await sql<{
        teamCount: number;
        taskCount: number;
        memberCount: number;
        taskLabelCounts: any;
    }>`
        WITH auth_check AS (
            SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            UNION ALL
            SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
            LIMIT 1
        ),
        counts AS (
            SELECT
                (SELECT count(*) FROM project_team WHERE fk_project_id = ${projectId}::uuid) as team_count,
                (SELECT count(*) FROM project_task WHERE fk_project_id = ${projectId}::uuid) as task_count,
                (SELECT count(*) FROM project_member WHERE fk_project_id = ${projectId}::uuid) as member_count
        ),
        label_counts AS (
            SELECT 
                jsonb_object_agg(status, count) as label_counts
            FROM (
                SELECT status, count(*) as count
                FROM project_task
                WHERE fk_project_id = ${projectId}::uuid
                GROUP BY status
            ) s
        )
        SELECT 
            team_count as "teamCount",
            task_count as "taskCount",
            member_count as "memberCount",
            COALESCE(label_counts, '{}'::jsonb) as "taskLabelCounts"
        FROM counts, label_counts
        WHERE EXISTS (SELECT 1 FROM auth_check)
    `.execute(db);

    const stats = result.rows[0];
    if (!stats) {
        return {
            teamCount: 0,
            taskCount: 0,
            memberCount: 0,
            taskLabelCounts: [],
        };
    }

    const taskLabelCounts = Object.entries(stats.taskLabelCounts || {}).map(
        ([label, count]) => ({
            label,
            count: count as number,
        }),
    );

    return {
        teamCount: Number(stats.teamCount),
        taskCount: Number(stats.taskCount),
        memberCount: Number(stats.memberCount),
        taskLabelCounts,
    };
};

export const getWorkspaceStats = async (
    userId: string,
): Promise<{
    projectCount: number;
    teamCount: number;
    assignedTaskCount: number;
}> => {
    const result = await sql<any>`
        WITH relevant_projects AS (
            SELECT fk_project_id as id FROM project_member WHERE fk_user_id = ${userId}
            UNION
            SELECT id FROM project WHERE fk_user_id = ${userId}
        ),
        project_count AS (
            SELECT COUNT(*) as count FROM relevant_projects
        ),
        team_count AS (
            SELECT COUNT(*) as count 
            FROM project_team 
            WHERE fk_project_id IN (SELECT id FROM relevant_projects)
        ),
        assigned_task_count AS (
            SELECT COUNT(*) as count 
            FROM project_task 
            WHERE fk_member_id = ${userId}
        )
        SELECT 
            pc.count as project_count,
            tc.count as team_count,
            atc.count as assigned_task_count
        FROM project_count pc, team_count tc, assigned_task_count atc
    `.execute(db);

    const stats = result.rows[0];
    return {
        projectCount: Number(stats?.project_count || 0),
        teamCount: Number(stats?.team_count || 0),
        assignedTaskCount: Number(stats?.assigned_task_count || 0),
    };
};
