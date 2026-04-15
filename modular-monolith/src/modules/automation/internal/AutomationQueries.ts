import { db } from '../../../database';
import { sql } from 'kysely';
import type { AutomationRule, AutomationScope } from '../AutomationService.ts';

export const insertAutomation = async (data: {
    userId: string;
    projectId: string;
    targetScope: AutomationScope;
    taskId?: string;
    teamId?: string;
    rules: any;
    isActive?: boolean;
}): Promise<AutomationRule> => {
    // Basic auth check: Ensure user is owner or member of project
    const authCheck = await sql`
        SELECT 1 FROM project WHERE id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
        UNION ALL
        SELECT 1 FROM project_member WHERE fk_project_id = ${data.projectId}::uuid AND fk_user_id = ${data.userId}
        LIMIT 1
    `.execute(db);

    if (authCheck.rows.length === 0) {
        throw new Error('Unauthorized');
    }

    const result = await db
        .insertInto('automations')
        .values({
            fk_project_id: data.projectId,
            actor_id: data.userId,
            target_scope: data.targetScope,
            fk_task_id: data.taskId || null,
            fk_team_id: data.teamId || null,
            rules: JSON.stringify(data.rules) as any,
            is_active: data.isActive ?? true,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

    return {
        id: result.id,
        projectId: result.fk_project_id,
        actorId: result.actor_id,
        targetScope: result.target_scope as AutomationScope,
        taskId: result.fk_task_id,
        teamId: result.fk_team_id,
        rules: result.rules,
        isActive: result.is_active,
        createdAt: result.created_at as Date,
        updatedAt: result.updated_at as Date,
    };
};

export const updateAutomationQuery = async (data: {
    userId: string;
    automationId: string;
    targetScope?: AutomationScope;
    taskId?: string | null;
    teamId?: string | null;
    rules?: any;
    isActive?: boolean;
}): Promise<void> => {
    const authCheck = await sql`
        SELECT 1 FROM automations ar
        JOIN project p ON ar.fk_project_id = p.id
        LEFT JOIN project_member pm ON pm.fk_project_id = p.id
        WHERE ar.id = ${data.automationId}::uuid
          AND (p.fk_user_id = ${data.userId} OR pm.fk_user_id = ${data.userId} OR ar.actor_id = ${data.userId})
        LIMIT 1
    `.execute(db);

    if (authCheck.rows.length === 0) {
        throw new Error('Unauthorized');
    }

    let updateQuery = db.updateTable('automations').where('id', '=', data.automationId);

    let hasUpdates = false;

    if (data.targetScope !== undefined) {
        updateQuery = updateQuery.set({ target_scope: data.targetScope });
        hasUpdates = true;
    }
    if (data.taskId !== undefined) {
        updateQuery = updateQuery.set({ fk_task_id: data.taskId });
        hasUpdates = true;
    }
    if (data.teamId !== undefined) {
        updateQuery = updateQuery.set({ fk_team_id: data.teamId });
        hasUpdates = true;
    }
    if (data.rules !== undefined) {
        updateQuery = updateQuery.set({ rules: JSON.stringify(data.rules) as any });
        hasUpdates = true;
    }
    if (data.isActive !== undefined) {
        updateQuery = updateQuery.set({ is_active: data.isActive });
        hasUpdates = true;
    }

    if (hasUpdates) {
        updateQuery = updateQuery.set({ updated_at: sql`CURRENT_TIMESTAMP` });
        await updateQuery.execute();
    }
};

export const getAutomationsQuery = async (data: {
    projectId?: string;
    actorId?: string;
    taskId?: string | null;
    teamId?: string | null;
    targetScope?: AutomationScope;
    cursor?: string;
    limit?: number;
}): Promise<{ automations: AutomationRule[]; nextCursor: string | null }> => {
    const limit = data.limit && data.limit > 0 ? data.limit : 50;

    let query = db.selectFrom('automations').selectAll().orderBy('created_at', 'desc').limit(limit + 1);

    if (data.projectId) {
        query = query.where('fk_project_id', '=', data.projectId);
    }
    if (data.actorId) {
        query = query.where('actor_id', '=', data.actorId);
    }
    if (data.taskId !== undefined) {
        if (data.taskId === null) {
            query = query.where('fk_task_id', 'is', null);
        } else {
            query = query.where('fk_task_id', '=', data.taskId);
        }
    }
    if (data.teamId !== undefined) {
        if (data.teamId === null) {
            query = query.where('fk_team_id', 'is', null);
        } else {
            query = query.where('fk_team_id', '=', data.teamId);
        }
    }
    if (data.targetScope) {
        query = query.where('target_scope', '=', data.targetScope);
    }

    if (data.cursor) {
        query = query.where('created_at', '<', data.cursor as any);
    }

    const rows = await query.execute();
    
    let nextCursor: string | null = null;
    if (rows.length > limit) {
        const nextRow = rows.pop();
        nextCursor = nextRow!.created_at?.toISOString() || null;
    }

    const automations: AutomationRule[] = rows.map((r) => ({
        id: r.id,
        projectId: r.fk_project_id,
        actorId: r.actor_id,
        targetScope: r.target_scope as AutomationScope,
        taskId: r.fk_task_id,
        teamId: r.fk_team_id,
        rules: r.rules,
        isActive: r.is_active,
        createdAt: r.created_at as Date,
        updatedAt: r.updated_at as Date,
    }));

    return { automations, nextCursor };
};

export const deleteAutomationQuery = async (data: {
    userId: string;
    automationId: string;
}): Promise<void> => {
    const authCheck = await sql`
        SELECT 1 FROM automations ar
        JOIN project p ON ar.fk_project_id = p.id
        LEFT JOIN project_member pm ON pm.fk_project_id = p.id
        WHERE ar.id = ${data.automationId}::uuid
          AND (p.fk_user_id = ${data.userId} OR pm.fk_user_id = ${data.userId} OR ar.actor_id = ${data.userId})
        LIMIT 1
    `.execute(db);

    if (authCheck.rows.length === 0) {
        throw new Error('Unauthorized');
    }

    await db.deleteFrom('automations').where('id', '=', data.automationId).execute();
};

const mapAutomations = (rows: any[]): AutomationRule[] => {
    return rows.map((r) => ({
        id: r.id,
        projectId: r.fk_project_id,
        actorId: r.actor_id,
        targetScope: r.target_scope as AutomationScope,
        taskId: r.fk_task_id,
        teamId: r.fk_team_id,
        rules: r.rules,
        isActive: r.is_active,
        createdAt: r.created_at as Date,
        updatedAt: r.updated_at as Date,
    }));
};

export const getAutomationsByTaskIdsQuery = async (taskIds: string[]): Promise<Map<string, AutomationRule[]>> => {
    if (taskIds.length === 0) return new Map();
    const rows = await db
        .selectFrom('automations')
        .selectAll()
        .where('fk_task_id', 'in', taskIds)
        .where('is_active', '=', true)
        .execute();
    
    const automations = mapAutomations(rows);
    const map = new Map<string, AutomationRule[]>();
    for (const auto of automations) {
        if (!auto.taskId) continue;
        const list = map.get(auto.taskId) || [];
        list.push(auto);
        map.set(auto.taskId, list);
    }
    return map;
};

export const getAutomationsByProjectIdsQuery = async (projectIds: string[]): Promise<Map<string, AutomationRule[]>> => {
    if (projectIds.length === 0) return new Map();
    const rows = await db
        .selectFrom('automations')
        .selectAll()
        .where('fk_project_id', 'in', projectIds)
        .where('target_scope', '=', 'PROJECT')
        .where('is_active', '=', true)
        .execute();
    
    const automations = mapAutomations(rows);
    const map = new Map<string, AutomationRule[]>();
    for (const auto of automations) {
        const list = map.get(auto.projectId) || [];
        list.push(auto);
        map.set(auto.projectId, list);
    }
    return map;
};

export const getAutomationsByTeamIdsQuery = async (teamIds: string[]): Promise<Map<string, AutomationRule[]>> => {
    if (teamIds.length === 0) return new Map();
    const rows = await db
        .selectFrom('automations')
        .selectAll()
        .where('fk_team_id', 'in', teamIds)
        .where('is_active', '=', true)
        .execute();
    
    const automations = mapAutomations(rows);
    const map = new Map<string, AutomationRule[]>();
    for (const auto of automations) {
        if (!auto.teamId) continue;
        const list = map.get(auto.teamId) || [];
        list.push(auto);
        map.set(auto.teamId, list);
    }
    return map;
};

/**
 * Internal trusted bulk update for the automation engine.
 *
 * Unlike the user-facing updateTask query, this:
 * - Skips auth checks (engine operates in a trusted context).
 * - Skips optimistic locking (no version check — engine is the source of truth).
 * - Restricts updates to non-structural fields only (no parentTaskId / materialized_path changes).
 * - Emits to BOTH Kafka lanes in one atomic CTE:
 *     - Display Lane: 'project.task.updated'  (always fires — keeps UI fresh)
 *     - Logic Lane:   'automation.trigger.task' (only if shouldPropagate is true)
 */
export const automationBulkUpdateTasks = async (
    taskIds: string[],
    projectId: string,
    params: Record<string, any>,
    context: { correlationId: string; depth: number },
    shouldPropagate: boolean,
): Promise<void> => {
    if (taskIds.length === 0) return;

    const { correlationId, depth } = context;

    // Extract allowed params (structural fields excluded deliberately)
    const status    = params.status    ?? null;
    const title     = params.title     ?? null;
    const desc      = params.description ?? null;
    const teamId    = params.teamId    ?? null;
    const memberId  = params.memberId  ?? null;

    const hasStatus  = 'status'      in params;
    const hasTitle   = 'title'       in params;
    const hasDesc    = 'description' in params;
    const hasTeam    = 'teamId'      in params;
    const hasMember  = 'memberId'    in params;

    await sql`
        WITH old_states AS (
            -- Snapshot the state BEFORE the update for the Logic Lane payload
            SELECT
                id,
                status,
                title,
                description,
                fk_team_id   AS "teamId",
                fk_member_id AS "memberId"
            FROM project_task
            WHERE id = ANY(${taskIds}::uuid[])
              AND fk_project_id = ${projectId}::uuid
        ),
        updated_tasks AS (
            UPDATE project_task
            SET
                status       = CASE WHEN ${hasStatus}  THEN ${status}          ELSE status       END,
                title        = CASE WHEN ${hasTitle}   THEN ${title}           ELSE title        END,
                description  = CASE WHEN ${hasDesc}    THEN ${desc}            ELSE description  END,
                fk_team_id   = CASE WHEN ${hasTeam}    THEN ${teamId}::uuid    ELSE fk_team_id   END,
                fk_member_id = CASE WHEN ${hasMember}  THEN ${memberId}        ELSE fk_member_id END,
                updated_by   = 'system',
                updated_at   = CURRENT_TIMESTAMP,
                version      = version + 1
            WHERE id = ANY(${taskIds}::uuid[])
              AND fk_project_id = ${projectId}::uuid
            RETURNING
                id,
                status,
                title,
                description,
                fk_team_id   AS "teamId",
                fk_member_id AS "memberId",
                fk_project_id AS "projectId",
                version
        ),
        display_outbox AS (
            -- Display Lane: always fires so the UI stays in sync
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT
                'project.task.updated',
                id::text,
                jsonb_build_object(
                    'taskId',    id,
                    'projectId', "projectId",
                    'correlationId', ${correlationId},
                    'updates',   ${JSON.stringify(params)}::jsonb
                )
            FROM updated_tasks
        ),
        logic_outbox AS (
            -- Logic Lane: only fires when shouldPropagate is true.
            -- Carries full oldState + newState for the next automation evaluation.
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT
                'automation.trigger.task',
                ut.id::text,
                jsonb_build_object(
                    'taskId',        ut.id,
                    'projectId',     ut."projectId",
                    'correlationId', ${correlationId},
                    'depth',         ${depth + 1},
                    'oldState', jsonb_build_object(
                        'status',   os.status,
                        'title',    os.title,
                        'description', os.description,
                        'teamId',   os."teamId",
                        'memberId', os."memberId"
                    ),
                    'newState', jsonb_build_object(
                        'status',   ut.status,
                        'title',    ut.title,
                        'description', ut.description,
                        'teamId',   ut."teamId",
                        'memberId', ut."memberId"
                    )
                )
            FROM updated_tasks ut
            JOIN old_states os ON os.id = ut.id
            WHERE ${shouldPropagate} = true
        )
        SELECT 1
    `.execute(db);
};
