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
    const rows = await db.selectFrom('automations').selectAll().where('fk_task_id', 'in', taskIds).execute();
    
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
    const rows = await db.selectFrom('automations').selectAll().where('fk_project_id', 'in', projectIds).where('target_scope', '=', 'PROJECT').execute();
    
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
    const rows = await db.selectFrom('automations').selectAll().where('fk_team_id', 'in', teamIds).execute();
    
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
