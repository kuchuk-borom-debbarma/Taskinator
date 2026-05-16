/**
 * @file ConditionRepository.ts
 * @description Persistence layer for Conditions with structural deduplication.
 * Ensures identical condition logic is only stored once.
 *
 * @mandate COND-01, COND-06
 */

import { db } from '../../../database/index.js';
import { getConditionHash } from './ConditionHasher.js';
import type { ConditionAST } from './types.js';

/**
 * Repository for managing condition persistence and labeling.
 */
export class ConditionRepository {
    /**
     * Saves a condition with structural deduplication and assigns a label.
     *
     * @param labelName The human-readable name for this condition logic.
     * @param ast The condition AST.
     * @param projectId The project this label belongs to.
     * @param userId The user creating/updating the label.
     * @returns The structural hash of the condition.
     */
    async saveCondition(
        labelName: string,
        ast: ConditionAST,
        projectId: string,
        userId: string,
    ): Promise<string> {
        const hash = getConditionHash(ast);

        // 1. Ensure structural condition exists (Structural Deduplication)
        // We use a separate query or an 'ON CONFLICT DO NOTHING' to keep it efficient.
        await db
            .insertInto('conditions')
            .values({
                id: hash,
                name: labelName, // Store the first label name as a reference name
                definition: JSON.stringify(ast) as any,
                created_by: userId,
            })
            .onConflict((oc) => oc.column('id').doNothing())
            .execute();

        // 2. Upsert the label mapping for the specific project
        await db
            .insertInto('condition_labels')
            .values({
                name: labelName,
                condition_hash: hash,
                project_id: projectId,
                created_by: userId,
                updated_by: userId,
            })
            .onConflict((oc) =>
                oc.columns(['project_id', 'name']).doUpdateSet({
                    condition_hash: hash,
                    updated_by: userId,
                    updated_at: new Date().toISOString() as any,
                }),
            )
            .execute();

        return hash;
    }

    /**
     * Retrieves a condition's structural definition by its label.
     *
     * @param labelName The label name.
     * @param projectId The project ID.
     * @returns The AST or null if not found.
     */
    async getConditionByLabel(
        labelName: string,
        projectId: string,
    ): Promise<ConditionAST | null> {
        const result = await db
            .selectFrom('condition_labels')
            .innerJoin(
                'conditions',
                'conditions.id',
                'condition_labels.condition_hash',
            )
            .select('conditions.definition')
            .where('condition_labels.name', '=', labelName)
            .where('condition_labels.project_id', '=', projectId)
            .executeTakeFirst();

        if (!result) return null;

        return result.definition as unknown as ConditionAST;
    }

    /**
     * Retrieves a condition's structural definition by its hash.
     *
     * @param hash The structural hash.
     * @returns The AST or null if not found.
     */
    async getConditionByHash(hash: string): Promise<ConditionAST | null> {
        const result = await db
            .selectFrom('conditions')
            .select('definition')
            .where('id', '=', hash)
            .executeTakeFirst();

        if (!result) return null;

        return result.definition as unknown as ConditionAST;
    }
}
