/**
 * @file ActionExecutor.ts
 * @description Interprets and runs Action AST sequences.
 * Returns a list of mutated entities for atomic persistence.
 *
 * @mandate D-01, D-02
 */

import type { ContextualEntity } from './ContextualEntity.js';
import type { ActionAST, ActionStep } from './types.js';

/**
 * Executes a sequence of action steps starting from a triggering entity.
 */
export class ActionExecutor {
    /**
     * Executes the provided Action AST against the 'self' entity.
     *
     * @param ast The sequence of action steps.
     * @param self The triggering entity (already wrapped in ContextualEntity).
     * @returns A promise resolving to an array of all modified ContextualEntities.
     */
    public async execute(
        ast: ActionAST,
        self: ContextualEntity,
    ): Promise<ContextualEntity[]> {
        // Track modified entities in a Set to ensure uniqueness.
        const modifiedEntities = new Set<ContextualEntity>();

        // Process steps in strict sequence (PIPE-03 semantics).
        for (const step of ast) {
            await this.executeStep(step, self, modifiedEntities);
        }

        return Array.from(modifiedEntities);
    }

    /**
     * Executes a single action step.
     */
    private async executeStep(
        step: ActionStep,
        self: ContextualEntity,
        modifiedEntities: Set<ContextualEntity>,
    ): Promise<void> {
        // 1. Resolve the target entity lazily.
        // If target is 'self', it returns the self entity.
        // If target is 'parent', 'project', etc., it fetches via registry.
        const targetEntity = await self.resolve(step.target);

        // 2. Perform the operation.
        switch (step.operation) {
            case 'set':
                targetEntity.set(step.field, step.value);
                // Track as modified for final persistence.
                modifiedEntities.add(targetEntity);
                break;
            case 'unset':
                targetEntity.set(step.field, undefined);
                modifiedEntities.add(targetEntity);
                break;
            default:
                throw new Error(
                    `Unsupported action operation: ${step.operation}`,
                );
        }
    }
}
