import { autoActionRegistry } from './registry.js';
import type { ConditionNode } from './types.js';

/**
 * Evaluates a Condition Node AST (logical or predicate) recursively against a state context.
 * Root engine handles boolean logic AND, OR, NOT and delegates predicates dynamically via the registry.
 */
export function evaluateCondition(node: ConditionNode, ctx: any): boolean {
    if (node.type === 'logical') {
        const { operator, children } = node;

        if (operator === 'AND') {
            if (children.length === 0) return true; // vacuously true
            return children.every((child) => evaluateCondition(child, ctx));
        }

        if (operator === 'OR') {
            if (children.length === 0) return false;
            return children.some((child) => evaluateCondition(child, ctx));
        }

        if (operator === 'NOT') {
            const child = children[0];
            if (!child) return false;
            // Negate the evaluation of the first child
            return !evaluateCondition(child, ctx);
        }
    }

    // Leaf predicates: dynamically resolve and evaluate via the registered definition
    const definition = autoActionRegistry.getCondition(node.type);
    if (!definition) {
        throw new Error(
            `Unrecognized condition predicate type: "${node.type}"`,
        );
    }

    return definition.evaluate(ctx, node);
}
