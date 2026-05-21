import { z } from 'zod';
import { actionRegistry } from '../actionEngine.ts';
import { conditionRegistry } from '../conditionEngine.ts';
import { type ConditionNode, conditionNodeSchema } from '../types.ts';

export const actionStepSchema = z.object({
    type: z.literal('action'),
    actionId: z.string(),
    inputs: z.any(),
});

export const conditionActionStepSchema = z.object({
    type: z.literal('condition_action'),
    condition: conditionNodeSchema,
    actionId: z.string(),
    inputs: z.any(),
});

export const pipelineStepSchema = z.discriminatedUnion('type', [
    actionStepSchema,
    conditionActionStepSchema,
]);

export type ActionStep = z.infer<typeof actionStepSchema>;
export type ConditionActionStep = z.infer<typeof conditionActionStepSchema>;
export type PipelineStep = z.infer<typeof pipelineStepSchema>;

export const autoActionFlowSchema = z.array(pipelineStepSchema);

/**
 * Recursively scans a condition tree to determine if any node uses an asynchronous condition definition.
 */
export function isConditionAsync(node: ConditionNode): boolean {
    if (node.type === 'logical') {
        return node.children.some((child) => isConditionAsync(child));
    }
    const def = conditionRegistry.getCondition(node.type);
    return def ? def.isAsync : false;
}

/**
 * Verifies that all actions and conditions within a pipeline are fully synchronous.
 * Throws an error if an unregistered action is referenced.
 */
export function isFlowSyncSafe(steps: PipelineStep[]): boolean {
    for (const step of steps) {
        const action = actionRegistry.getAction(step.actionId);
        if (!action) {
            throw new Error(`Action "${step.actionId}" is not registered.`);
        }
        if (action.isAsync) {
            return false;
        }

        if (step.type === 'condition_action') {
            if (isConditionAsync(step.condition)) {
                return false;
            }
        }
    }
    return true;
}
