import { db } from '../../../database/index.ts';
import type {
    BehaviorRule,
    BehaviorRuleUpdate,
    NewBehaviorRule,
} from '../../../database/tables/BehaviorRule.ts';

export async function insertBehaviorRule(
    data: NewBehaviorRule,
    actorId: string,
): Promise<BehaviorRule> {
    return db.transaction().execute(async (trx) => {
        const created = await trx
            .insertInto('behavior_rule')
            .values({
                ...data,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        // Write to outbox_events
        await trx
            .insertInto('outbox_events')
            .values({
                kafka_topic: 'task-events',
                kafka_key: created.fk_project_id.toString(),
                payload: JSON.stringify({
                    type: 'behavior_rule.created',
                    ruleId: created.id,
                    projectId: created.fk_project_id,
                    name: created.name,
                    isActive: created.is_active,
                    behaviorType: created.behavior_type,
                    actorId: actorId || 'system:auto-action',
                }) as any,
            })
            .execute();

        return created;
    });
}

export async function selectBehaviorRuleById(
    id: string,
): Promise<BehaviorRule | undefined> {
    return db
        .selectFrom('behavior_rule')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
}

export async function selectBehaviorRulesForProject(
    projectId: string,
): Promise<BehaviorRule[]> {
    return db
        .selectFrom('behavior_rule')
        .selectAll()
        .where('fk_project_id', '=', projectId)
        .orderBy('created_at', 'asc')
        .execute();
}

export async function updateBehaviorRuleById(
    id: string,
    patch: BehaviorRuleUpdate,
    expectedVersion: number,
    actorId: string,
): Promise<BehaviorRule> {
    return db.transaction().execute(async (trx) => {
        // Optimistic concurrency check
        const current = await trx
            .selectFrom('behavior_rule')
            .select([
                'version',
                'fk_project_id',
                'name',
                'is_active',
                'behavior_type',
            ])
            .where('id', '=', id)
            .executeTakeFirst();

        if (!current) {
            throw new Error(`Behavior Rule "${id}" not found.`);
        }

        if (current.version !== expectedVersion) {
            throw new Error(
                `Optimistic locking failure: expected version ${expectedVersion} but found ${current.version}`,
            );
        }

        const updated = await trx
            .updateTable('behavior_rule')
            .set({
                ...patch,
                version: current.version + 1,
                updated_at: new Date().toISOString() as any,
            })
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirstOrThrow();

        // Write to outbox_events
        await trx
            .insertInto('outbox_events')
            .values({
                kafka_topic: 'task-events',
                kafka_key: updated.fk_project_id.toString(),
                payload: JSON.stringify({
                    type: 'behavior_rule.updated',
                    ruleId: updated.id,
                    projectId: updated.fk_project_id,
                    name: updated.name,
                    isActive: updated.is_active,
                    behaviorType: updated.behavior_type,
                    actorId: actorId || 'system:auto-action',
                }) as any,
            })
            .execute();

        return updated;
    });
}

export async function deleteBehaviorRuleById(id: string): Promise<void> {
    await db.transaction().execute(async (trx) => {
        const deleted = await trx
            .deleteFrom('behavior_rule')
            .where('id', '=', id)
            .returningAll()
            .executeTakeFirst();

        if (deleted) {
            await trx
                .insertInto('outbox_events')
                .values({
                    kafka_topic: 'task-events',
                    kafka_key: deleted.fk_project_id.toString(),
                    payload: JSON.stringify({
                        type: 'behavior_rule.deleted',
                        ruleId: deleted.id,
                        projectId: deleted.fk_project_id,
                        name: deleted.name,
                    }) as any,
                })
                .execute();
        }
    });
}

export async function selectActiveBehaviorRulesForProject(
    projectId: string,
): Promise<BehaviorRule[]> {
    return db
        .selectFrom('behavior_rule')
        .selectAll()
        .where('fk_project_id', '=', projectId)
        .where('is_active', '=', true)
        .orderBy('created_at', 'asc')
        .execute();
}
