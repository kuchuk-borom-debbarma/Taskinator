import { db } from '../../../database';
import { sql } from 'kysely';
import type { AutomationRule, AutomationScope } from '../AutomationService.ts';

export const insertAutomation = async (data: {
    userId: string;
    projectId: string;
    name: string;
    targetScope: AutomationScope;
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
            name: data.name,
            target_scope: data.targetScope,
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
        name: result.name,
        targetScope: result.target_scope as AutomationScope,
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
    name?: string;
    targetScope?: AutomationScope;
    teamId?: string | null;
    rules?: any;
    isActive?: boolean;
}): Promise<AutomationRule> => {
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

    let updateQuery = db
        .updateTable('automations')
        .where('id', '=', data.automationId);

    let hasUpdates = false;

    if (data.name !== undefined) {
        updateQuery = updateQuery.set({ name: data.name });
        hasUpdates = true;
    }
    if (data.targetScope !== undefined) {
        updateQuery = updateQuery.set({ target_scope: data.targetScope });
        hasUpdates = true;
    }
    if (data.teamId !== undefined) {
        updateQuery = updateQuery.set({ fk_team_id: data.teamId });
        hasUpdates = true;
    }
    if (data.rules !== undefined) {
        updateQuery = updateQuery.set({
            rules: JSON.stringify(data.rules) as any,
        });
        hasUpdates = true;
    }
    if (data.isActive !== undefined) {
        updateQuery = updateQuery.set({ is_active: data.isActive });
        hasUpdates = true;
    }

    if (!hasUpdates) {
        // If no updates, just fetch the existing record
        return db
            .selectFrom('automations')
            .selectAll()
            .where('id', '=', data.automationId)
            .executeTakeFirstOrThrow()
            .then((r) => ({
                id: r.id,
                projectId: r.fk_project_id,
                actorId: r.actor_id,
                name: r.name,
                targetScope: r.target_scope as AutomationScope,
                teamId: r.fk_team_id,
                rules: r.rules,
                isActive: r.is_active,
                createdAt: r.created_at as Date,
                updatedAt: r.updated_at as Date,
            }));
    }

    const result = await updateQuery
        .set({ updated_at: sql`CURRENT_TIMESTAMP` })
        .returningAll()
        .executeTakeFirstOrThrow();

    return {
        id: result.id,
        projectId: result.fk_project_id,
        actorId: result.actor_id,
        name: result.name,
        targetScope: result.target_scope as AutomationScope,
        teamId: result.fk_team_id,
        rules: result.rules,
        isActive: result.is_active,
        createdAt: result.created_at as Date,
        updatedAt: result.updated_at as Date,
    };
};

export const getAutomationsQuery = async (data: {
    projectId?: string;
    actorId?: string;
    teamId?: string | null;
    targetScope?: AutomationScope;
    cursor?: string;
    limit?: number;
}): Promise<{ automations: AutomationRule[]; nextCursor: string | null }> => {
    const limit = data.limit && data.limit > 0 ? data.limit : 50;

    let query = db
        .selectFrom('automations')
        .selectAll()
        .orderBy('created_at', 'desc')
        .limit(limit + 1);

    if (data.projectId) {
        query = query.where('fk_project_id', '=', data.projectId);
    }
    if (data.actorId) {
        query = query.where('actor_id', '=', data.actorId);
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
        name: r.name,
        targetScope: r.target_scope as AutomationScope,
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

    await db
        .deleteFrom('automations')
        .where('id', '=', data.automationId)
        .execute();
};

const mapAutomations = (rows: any[]): AutomationRule[] => {
    return rows.map((r) => ({
        id: r.id,
        projectId: r.fk_project_id,
        actorId: r.actor_id,
        name: r.name,
        targetScope: r.target_scope as AutomationScope,
        teamId: r.fk_team_id,
        rules: r.rules,
        isActive: r.is_active,
        createdAt: r.created_at as Date,
        updatedAt: r.updated_at as Date,
    }));
};

export const getAutomationsByProjectIdsQuery = async (
    projectIds: string[],
): Promise<Map<string, AutomationRule[]>> => {
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

export const getAutomationsByTeamIdsQuery = async (
    teamIds: string[],
): Promise<Map<string, AutomationRule[]>> => {
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

