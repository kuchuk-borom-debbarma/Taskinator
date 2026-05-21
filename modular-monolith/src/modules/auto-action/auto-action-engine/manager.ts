import { db } from '../../../database/index.ts';
import type {
    AutoAction,
    AutoActionUpdate,
    NewAutoAction,
} from '../../../database/tables/AutoAction.ts';
import { autoActionFlowSchema, isFlowSyncSafe } from './types.ts';

/**
 * Checks if an active auto-action with the given name already exists in the same project.
 * Throws an error if a conflict is found.
 */
async function checkNameUniqueness(
    projectId: string,
    name: string,
    excludeId?: string,
): Promise<void> {
    let query = db
        .selectFrom('auto_action')
        .select('id')
        .where('fk_project_id', '=', projectId)
        .where('name', '=', name)
        .where('is_active', '=', true);

    if (excludeId) {
        query = query.where('id', '!=', excludeId);
    }

    const existing = await query.executeTakeFirst();
    if (existing) {
        throw new Error(
            `An active auto-action with the name "${name}" already exists in project "${projectId}".`,
        );
    }
}

/**
 * Validates the structure and sync-safety of the pipeline steps.
 */
function validatePipeline(steps: any, isSync: boolean): void {
    // Validate schema shape using Zod
    const parsedSteps = autoActionFlowSchema.parse(steps);

    // Enforce sync boundary rules if is_sync is enabled
    if (isSync) {
        const syncSafe = isFlowSyncSafe(parsedSteps);
        if (!syncSafe) {
            throw new Error(
                `Auto action is configured as synchronous but contains asynchronous steps (actions or conditions).`,
            );
        }
    }
}

/**
 * Creates a new Auto Action in the database.
 * Enforces project-scoped name uniqueness and sync-safety rules.
 */
export async function createAutoAction(
    data: NewAutoAction,
): Promise<AutoAction> {
    const name = data.name || 'Untitled Auto Action';
    const isActive =
        data.is_active !== undefined ? (data.is_active as boolean) : true;
    const isSync =
        data.is_sync !== undefined ? (data.is_sync as boolean) : true;

    // Enforce unique active name per project
    if (isActive) {
        await checkNameUniqueness(data.fk_project_id, name);
    }

    // Parse and validate steps
    const rawSteps = data.steps;
    const steps =
        typeof rawSteps === 'string' ? JSON.parse(rawSteps) : rawSteps;
    validatePipeline(steps || [], isSync);

    const insertPayload = {
        ...data,
        name,
        is_active: isActive,
        is_sync: isSync,
        steps:
            data.steps !== undefined
                ? ((typeof data.steps === 'string'
                      ? data.steps
                      : JSON.stringify(data.steps)) as any)
                : '[]',
        triggers:
            data.triggers !== undefined
                ? ((typeof data.triggers === 'string'
                      ? data.triggers
                      : JSON.stringify(data.triggers)) as any)
                : '[]',
        version: 1,
    };

    const created = await db
        .insertInto('auto_action')
        .values(insertPayload)
        .returningAll()
        .executeTakeFirstOrThrow();

    return created;
}

/**
 * Updates an existing Auto Action using Optimistic Concurrency Control (OCC).
 * Enforces project-scoped name uniqueness and sync-safety rules.
 */
export async function updateAutoAction(
    id: string,
    data: AutoActionUpdate,
    expectedVersion: number,
): Promise<AutoAction> {
    const current = await db
        .selectFrom('auto_action')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

    if (!current) {
        throw new Error(`Auto Action "${id}" not found.`);
    }

    // Optimistic Concurrency Control Check
    if (current.version !== expectedVersion) {
        throw new Error(
            `Optimistic locking failure: expected version ${expectedVersion} but found ${current.version}`,
        );
    }

    const newName = data.name !== undefined ? data.name : current.name;
    const newIsActive =
        data.is_active !== undefined
            ? (data.is_active as boolean)
            : current.is_active;

    // Enforce name uniqueness if we are active and name or activity is changing
    if (
        newIsActive &&
        (data.name !== undefined || data.is_active !== undefined)
    ) {
        await checkNameUniqueness(current.fk_project_id, newName as string, id);
    }

    const newIsSync =
        data.is_sync !== undefined
            ? (data.is_sync as boolean)
            : current.is_sync;
    const rawSteps = data.steps !== undefined ? data.steps : current.steps;
    const steps =
        typeof rawSteps === 'string' ? JSON.parse(rawSteps) : rawSteps;

    // Validate sync safety when steps or sync status changes
    if (data.steps !== undefined || data.is_sync !== undefined) {
        validatePipeline(steps || [], newIsSync);
    }

    const updatePayload = {
        ...data,
        steps:
            data.steps !== undefined
                ? ((typeof data.steps === 'string'
                      ? data.steps
                      : JSON.stringify(data.steps)) as any)
                : undefined,
        triggers:
            data.triggers !== undefined
                ? ((typeof data.triggers === 'string'
                      ? data.triggers
                      : JSON.stringify(data.triggers)) as any)
                : undefined,
        version: current.version + 1,
        updated_at: new Date(),
    };

    // Filter out undefined values to avoid Kysely issues
    const cleanedPayload = Object.fromEntries(
        Object.entries(updatePayload).filter(([_, v]) => v !== undefined),
    );

    const updated = await db
        .updateTable('auto_action')
        .set(cleanedPayload)
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

/**
 * Deletes an Auto Action by ID.
 */
export async function deleteAutoAction(id: string): Promise<void> {
    await db.deleteFrom('auto_action').where('id', '=', id).execute();
}

/**
 * Retrieves all Auto Actions for a specific project.
 */
export async function getAutoActionsForProject(
    projectId: string,
): Promise<AutoAction[]> {
    return await db
        .selectFrom('auto_action')
        .selectAll()
        .where('fk_project_id', '=', projectId)
        .orderBy('created_at', 'asc')
        .execute();
}
