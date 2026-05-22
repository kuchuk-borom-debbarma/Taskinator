import { db } from '../../../../database/index.js';
import type {
    AutoAction,
    NewAutoAction,
} from '../../../../database/tables/AutoAction.js';

/**
 * Raw Kysely DB queries for the auto_action table.
 * Zero business logic — all validation and orchestration lives in AutoActionServiceImpl.
 */

export async function insertAutoAction(
    data: NewAutoAction,
): Promise<AutoAction> {
    return db
        .insertInto('auto_action')
        .values(data)
        .returningAll()
        .executeTakeFirstOrThrow();
}

export async function selectAutoActionById(
    id: string,
): Promise<AutoAction | undefined> {
    return db
        .selectFrom('auto_action')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
}

export async function selectAutoActionForExecution(
    id: string,
): Promise<AutoAction | undefined> {
    return selectAutoActionById(id);
}

export async function updateAutoActionById(
    id: string,
    patch: Record<string, any>,
    expectedVersion: number,
): Promise<AutoAction> {
    const updated = await db
        .updateTable('auto_action')
        .set(patch)
        .where('id', '=', id)
        .where('version', '=', expectedVersion)
        .returningAll()
        .executeTakeFirst();

    if (!updated) {
        throw new Error(
            `Failed to update Auto Action "${id}". Potential concurrent update.`,
        );
    }

    return updated;
}

export async function deleteAutoActionById(id: string): Promise<void> {
    await db.deleteFrom('auto_action').where('id', '=', id).execute();
}

export async function selectAutoActionsForProject(
    projectId: string,
): Promise<AutoAction[]> {
    return db
        .selectFrom('auto_action')
        .selectAll()
        .where('fk_project_id', '=', projectId)
        .orderBy('created_at', 'asc')
        .execute();
}

export async function selectActiveAutoActionsForProject(
    projectId: string,
): Promise<AutoAction[]> {
    return db
        .selectFrom('auto_action')
        .selectAll()
        .where('fk_project_id', '=', projectId)
        .where('is_active', '=', true)
        .orderBy('created_at', 'asc')
        .execute();
}

export async function selectActiveAutoActionByName(
    projectId: string,
    name: string,
    excludeId?: string,
): Promise<AutoAction | undefined> {
    let query = db
        .selectFrom('auto_action')
        .selectAll()
        .where('fk_project_id', '=', projectId)
        .where('name', '=', name)
        .where('is_active', '=', true);

    if (excludeId) {
        query = query.where('id', '!=', excludeId);
    }

    return query.executeTakeFirst();
}
