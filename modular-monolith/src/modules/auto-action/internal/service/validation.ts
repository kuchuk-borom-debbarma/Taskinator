import type { ConditionNode, PipelineStep } from '../../types.js';
import { actionRegistry } from '../engines/actionEngine.js';
import { conditionRegistry } from '../engines/conditionEngine.js';

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
