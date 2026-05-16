/**
 * @file ContextBuilder.ts
 * @description Builds the evaluation context for the Condition Engine.
 * Fetches the latest "is" state from the database and pairs it with the "was" snapshot.
 *
 * @mandate D-02
 */

import { db } from '../../../database/index.js';
import type { EvaluationContext } from './types.js';

/**
 * Supported entity types for condition evaluation.
 */
export type EntityType =
    | 'project_task'
    | 'project_team'
    | 'project'
    | 'project_member'
    | 'project_team_member';

/**
 * Builds the evaluation context by fetching fresh data from the database.
 */
export class ContextBuilder {
    /**
     * Fetches the latest state of an entity and builds the evaluation context.
     *
     * @param entityType The table name/entity type.
     * @param entityId The unique identifier of the entity.
     * @param wasSnapshot The previous state snapshot (historical data).
     * @returns A promise resolving to the EvaluationContext.
     */
    async buildContext(
        entityType: EntityType,
        entityId: string,
        wasSnapshot: Record<string, any> = {},
    ): Promise<EvaluationContext> {
        // 1. Fetch the latest "is" state from the database
        // We use a generic query across the supported tables.
        const isState = await this.fetchIsState(entityType, entityId);

        // 2. Construct the context object
        // If the entity was deleted, isState will be an empty object.
        return {
            is: isState || {},
            was: wasSnapshot,
        };
    }

    /**
     * Internal helper to fetch the latest state from the DB.
     * Always fetches immediately before evaluation to ensure "Live-Fetch" logic.
     */
    private async fetchIsState(
        entityType: EntityType,
        entityId: string,
    ): Promise<Record<string, any> | null> {
        let result: any;

        switch (entityType) {
            case 'project_task':
                result = await db
                    .selectFrom('project_task')
                    .selectAll()
                    .where('id', '=', entityId as any)
                    .executeTakeFirst();
                break;
            case 'project_team':
                result = await db
                    .selectFrom('project_team')
                    .selectAll()
                    .where('id', '=', entityId as any)
                    .executeTakeFirst();
                break;
            case 'project':
                result = await db
                    .selectFrom('project')
                    .selectAll()
                    .where('id', '=', entityId as any)
                    .executeTakeFirst();
                break;
            case 'project_member':
                result = await db
                    .selectFrom('project_member')
                    .selectAll()
                    .where('id', '=', entityId as any)
                    .executeTakeFirst();
                break;
            case 'project_team_member':
                result = await db
                    .selectFrom('project_team_member')
                    .selectAll()
                    .where('id', '=', entityId as any)
                    .executeTakeFirst();
                break;
            default:
                throw new Error(`Unsupported entity type: ${entityType}`);
        }

        if (!result) return null;

        // Convert Dates and other complex types to serializable primitives if necessary,
        // although Kysely/PG drivers usually handle standard types.
        // We return the raw object as the AST evaluation uses lodash.get.
        return result as Record<string, any>;
    }
}
