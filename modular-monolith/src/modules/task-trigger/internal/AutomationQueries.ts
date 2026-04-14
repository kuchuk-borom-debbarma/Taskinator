import { db } from '../../../database';
import { sql } from 'kysely';
import type { AutomationGroup, AutomationRule, AutomationScope } from '../TaskTriggerService.ts';

/**
 * Optimized query to find all applicable automation groups for a given event and scope.
 */
export const getMatchingAutomationGroups = async (data: {
    triggerEvent: string;
    scope: AutomationScope;
    targetId: string;
}): Promise<AutomationGroup[]> => {
    const result = await sql<any>`
        SELECT id, name, scope, target_id, trigger_event, is_enabled, created_at, updated_at
        FROM automation_groups
        WHERE trigger_event = ${data.triggerEvent}
          AND is_enabled = TRUE
          AND scope = ${data.scope}
          AND target_id = ${data.targetId}::uuid
    `.execute(db);

    return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        scope: row.scope as AutomationScope,
        targetId: row.target_id,
        triggerEvent: row.trigger_event,
        isEnabled: row.is_enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
};

/**
 * Retrieves all rules for a specific group, ordered by sequence number.
 */
export const getRulesByGroupId = async (groupId: string): Promise<AutomationRule[]> => {
    const result = await sql<any>`
        SELECT id, group_id, sequence_number, conditions, actions, can_propagate, version, created_at, updated_at
        FROM automation_rules
        WHERE group_id = ${groupId}::uuid
        ORDER BY sequence_number ASC
    `.execute(db);

    return result.rows.map(row => ({
        id: row.id,
        groupId: row.group_id,
        sequenceNumber: row.sequence_number,
        conditions: row.conditions,
        actions: row.actions,
        canPropagate: row.can_propagate,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
};

export const createAutomationGroupQuery = async (data: {
    userId: string; // Auth check omitted for simplicity in Phase 1, but we should add it
    name: string;
    scope: AutomationScope;
    targetId: string | null;
    triggerEvent: string;
}): Promise<AutomationGroup> => {
    const result = await sql<any>`
        INSERT INTO automation_groups (name, scope, target_id, trigger_event)
        VALUES (${data.name}, ${data.scope}, ${data.targetId}::uuid, ${data.triggerEvent})
        RETURNING *
    `.execute(db);

    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        scope: row.scope as AutomationScope,
        targetId: row.target_id,
        triggerEvent: row.trigger_event,
        isEnabled: row.is_enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

export const addRuleToGroupQuery = async (data: {
    groupId: string;
    sequenceNumber: number;
    conditions: any;
    actions: any[];
    canPropagate?: boolean;
}): Promise<AutomationRule> => {
    const result = await sql<any>`
        INSERT INTO automation_rules (group_id, sequence_number, conditions, actions, can_propagate)
        VALUES (${data.groupId}::uuid, ${data.sequenceNumber}, ${data.conditions}::jsonb, ${JSON.stringify(data.actions)}::jsonb, ${data.canPropagate ?? true})
        RETURNING *
    `.execute(db);

    const row = result.rows[0];
    return {
        id: row.id,
        groupId: row.group_id,
        sequenceNumber: row.sequence_number,
        conditions: row.conditions,
        actions: row.actions,
        canPropagate: row.can_propagate,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};
