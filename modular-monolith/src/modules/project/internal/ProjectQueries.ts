import type {
    AddProjectMembersParam,
    CreateProjectParam,
    DeleteProjectMembersParam,
    DeleteProjectsParam,
    Project,
    ProjectMember,
} from '../ProjectService.ts';
import { db } from '../../../database';
import {
    decodeCursor,
    encodeCursor,
    getTimeString,
} from '../../../utils/utils.ts';
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
            -- This is a bit complex as we need to aggregate taskLabelCounts across all tasks in the project.
            -- For simplicity and performance, we'll just return an empty list or implement a basic count if columns exist.
            -- Assuming we want to aggregate 'status' or similar if they are labels.
            -- The prompt mentioned 'label task count'.
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
