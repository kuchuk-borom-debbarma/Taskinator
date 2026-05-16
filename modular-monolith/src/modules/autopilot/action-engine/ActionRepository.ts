/**
 * @file ActionRepository.ts
 * @description Persistence layer for Actions with structural deduplication.
 * Ensures identical action logic is only stored once.
 */

import { db } from '../../../database/index.js';
import { getActionHash } from './ActionHasher.js';
import type { ActionAST } from './types.js';

/**
 * Repository for managing action persistence and labeling.
 */
export class ActionRepository {
    /**
     * Saves an action with structural deduplication and assigns a label.
     *
     * @param labelName The human-readable name for this action logic.
     * @param ast The action AST (sequence of steps).
     * @param projectId The project this label belongs to.
     * @param userId The user creating/updating the label.
     * @returns The structural hash of the action.
     */
    async saveAction(
        labelName: string,
        ast: ActionAST,
        projectId: string,
        userId: string,
    ): Promise<string> {
        const hash = getActionHash(ast);

        // 1. Ensure structural action exists (Structural Deduplication)
        await db
            .insertInto('actions')
            .values({
                id: hash,
                name: labelName, // Store the first label name as a reference name
                steps: JSON.stringify(ast) as any,
                created_by: userId,
            })
            .onConflict((oc) => oc.column('id').doNothing())
            .execute();

        // 2. Upsert the label mapping for the specific project
        await db
            .insertInto('action_labels')
            .values({
                name: labelName,
                action_hash: hash,
                project_id: projectId,
                created_by: userId,
                updated_by: userId,
            })
            .onConflict((oc) =>
                oc.columns(['project_id', 'name']).doUpdateSet({
                    action_hash: hash,
                    updated_by: userId,
                    updated_at: new Date().toISOString(),
                }),
            )
            .execute();

        return hash;
    }

    /**
     * Retrieves an action's structural definition by its label.
     *
     * @param labelName The label name.
     * @param projectId The project ID.
     * @returns The AST or null if not found.
     */
    async getActionByLabel(
        labelName: string,
        projectId: string,
    ): Promise<ActionAST | null> {
        const result = await db
            .selectFrom('action_labels')
            .innerJoin('actions', 'actions.id', 'action_labels.action_hash')
            .select('actions.steps')
            .where('action_labels.name', '=', labelName)
            .where('action_labels.project_id', '=', projectId)
            .executeTakeFirst();

        if (!result) return null;

        // steps might be returned as string or object depending on driver/kysely config
        return (
            typeof result.steps === 'string'
                ? JSON.parse(result.steps)
                : result.steps
        ) as ActionAST;
    }

    /**
     * Retrieves an action's structural definition by its hash.
     *
     * @param hash The structural hash.
     * @returns The AST or null if not found.
     */
    async getActionByHash(hash: string): Promise<ActionAST | null> {
        const result = await db
            .selectFrom('actions')
            .select('steps')
            .where('id', '=', hash)
            .executeTakeFirst();

        if (!result) return null;

        return (
            typeof result.steps === 'string'
                ? JSON.parse(result.steps)
                : result.steps
        ) as ActionAST;
    }
}
