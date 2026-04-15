import { db } from '../../database/index.ts';
import { sql } from 'kysely';
import type {
    Project,
    ProjectMember,
} from '../../modules/project/ProjectService.ts';
import type { ProjectTask } from '../../modules/task/TaskService.ts';
import type { Team, TeamMember } from '../../modules/team/TeamService.ts';

/**
 * Creates a real user row in the `users` table.
 * Returns the inserted user (id, email, username).
 */
export async function createUser(overrides?: {
    email?: string;
    username?: string;
    password_hash?: string;
}): Promise<{ id: string; email: string; username: string }> {
    const suffix = Math.random().toString(36).slice(2, 8);
    const result = await db
        .insertInto('users')
        .values({
            email: overrides?.email ?? `test-${suffix}@example.com`,
            username: overrides?.username ?? `user-${suffix}`,
            password_hash: overrides?.password_hash ?? 'hashed-pwd',
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    return { id: result.id, email: result.email, username: result.username };
}

/**
 * Creates a real project row via direct DB insert (bypasses wCTE to avoid
 * outbox noise in tests that don't care about it).
 */
export async function createProject(
    userId: string,
    overrides?: { name?: string; description?: string },
): Promise<Project> {
    const result = await sql<{
        id: string;
        name: string;
        description: string | null;
        userId: string;
        version: number;
        lastEventId: string | null;
        createdAt: Date;
        updatedAt: any;
    }>`
        INSERT INTO project (name, description, fk_user_id)
        VALUES (
            ${overrides?.name ?? 'Test Project'},
            ${overrides?.description ?? null},
            ${userId}
        )
        RETURNING
            id,
            name,
            description,
            fk_user_id AS "userId",
            version,
            last_event_id AS "lastEventId",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
    `.execute(db);

    return result.rows[0]!;
}

/**
 * Adds a user as a project member directly (bypasses wCTE outbox noise).
 */
export async function addProjectMember(
    projectId: string,
    userId: string,
): Promise<ProjectMember> {
    const result = await sql<{
        id: string;
        userId: string;
        projectId: string;
        version: number;
        lastEventId: string | null;
        createdAt: Date;
        updatedAt: any;
    }>`
        INSERT INTO project_member (fk_project_id, fk_user_id)
        VALUES (${projectId}::uuid, ${userId})
        RETURNING
            id,
            fk_user_id AS "userId",
            fk_project_id AS "projectId",
            version,
            last_event_id AS "lastEventId",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
    `.execute(db);
    return result.rows[0]!;
}

/**
 * Creates a task directly via INSERT (no auth check, no outbox).
 * Useful for seeding test data without triggering side effects.
 */
export async function createTask(
    projectId: string,
    userId: string,
    overrides?: {
        title?: string;
        status?: string;
        parentTaskId?: string;
        materializedPath?: string;
    },
): Promise<ProjectTask> {
    const result = await sql<ProjectTask>`
        INSERT INTO project_task (
            fk_project_id, fk_parent_task_id, title, description, status,
            materialized_path, created_by, updated_by
        )
        VALUES (
            ${projectId}::uuid,
            ${overrides?.parentTaskId ? sql`${overrides.parentTaskId}::uuid` : null},
            ${overrides?.title ?? 'Test Task'},
            '',
            ${overrides?.status ?? 'TODO'},
            ${overrides?.materializedPath ?? ''},
            ${userId},
            ${userId}
        )
        RETURNING
            id,
            fk_project_id AS "projectId",
            fk_team_id AS "teamId",
            fk_member_id AS "memberId",
            fk_parent_task_id AS "parentTaskId",
            title,
            description,
            status,
            materialized_path AS "materializedPath",
            version,
            last_event_id AS "lastEventId",
            created_by AS "createdBy",
            updated_by AS "updatedBy",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
    `.execute(db);
    return result.rows[0]!;
}

/**
 * Creates a child task under a parent, computing the materialized path.
 */
export async function createChildTask(
    projectId: string,
    userId: string,
    parent: ProjectTask,
    overrides?: { title?: string; status?: string },
): Promise<ProjectTask> {
    const parentPath = parent.materializedPath
        ? `${parent.materializedPath}/${parent.id}`
        : parent.id;

    return createTask(projectId, userId, {
        ...overrides,
        parentTaskId: parent.id,
        materializedPath: parentPath,
    });
}

/**
 * Creates a team directly via INSERT (no auth check, no outbox).
 */
export async function createTeam(
    projectId: string,
    userId: string,
    name = 'Test Team',
): Promise<Team> {
    const result = await sql<Team>`
        INSERT INTO project_team (fk_project_id, name, fk_user_id)
        VALUES (${projectId}::uuid, ${name}, ${userId})
        RETURNING
            id,
            name,
            fk_project_id AS "projectId",
            fk_user_id AS "createdBy",
            version,
            last_event_id AS "lastEventId",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
    `.execute(db);
    return result.rows[0]!;
}

/**
 * Adds a user to a team directly (no auth check, no outbox).
 */
export async function addTeamMember(
    projectId: string,
    teamId: string,
    userId: string,
): Promise<TeamMember> {
    const result = await sql<TeamMember>`
        INSERT INTO project_team_member (fk_project_id, fk_team_id, fk_user_id)
        VALUES (${projectId}::uuid, ${teamId}::uuid, ${userId})
        RETURNING
            id,
            fk_team_id AS "teamId",
            fk_user_id AS "userId",
            fk_project_id AS "projectId",
            version,
            last_event_id AS "lastEventId",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
    `.execute(db);
    return result.rows[0]!;
}
