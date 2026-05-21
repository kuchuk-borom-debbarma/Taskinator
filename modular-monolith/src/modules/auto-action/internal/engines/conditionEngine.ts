import type { ConditionDefinition, ConditionNode } from '../../types.js';

/**
 * Isolated Registry containing all registered condition definitions.
 */
export class ConditionRegistry {
    private readonly conditions = new Map<string, ConditionDefinition<any>>();

    /**
     * Clears all registered conditions (primarily for testing purposes).
     */
    public clear(): void {
        this.conditions.clear();
    }

    /**
     * Registers a condition definition.
     */
    public registerCondition(condition: ConditionDefinition<any>): void {
        if (this.conditions.has(condition.type)) {
            throw new Error(
                `Condition with type "${condition.type}" is already registered.`,
            );
        }
        this.conditions.set(condition.type, condition);
    }

    /**
     * Retrieves a registered condition by its type.
     */
    public getCondition(type: string): ConditionDefinition<any> | undefined {
        return this.conditions.get(type);
    }

    /**
     * Lists all registered conditions.
     */
    public getAllConditions(): ConditionDefinition<any>[] {
        return Array.from(this.conditions.values());
    }
}

/**
 * Singleton instance of the isolated condition registry.
 */
export const conditionRegistry = new ConditionRegistry();

/**
 * Evaluates a Condition Node AST (logical or predicate) recursively against a state context.
 * This evaluator is purely functional and stateless, operating entirely on the provided context snapshot.
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

    // Leaf predicates: dynamically resolve and evaluate via the condition registry
    const definition = conditionRegistry.getCondition(node.type);
    if (!definition) {
        throw new Error(
            `Unrecognized condition predicate type: "${node.type}"`,
        );
    }

    return definition.evaluate(ctx, node);
}

/**
 * Evaluates a condition tree starting from a specific child index within a top-level
 * logical AND node. This enables condition splitting for very long condition trees —
 * you can resume evaluation from child N without re-evaluating children 0..N-1.
 *
 * Rules:
 * - Only applies to the TOP-LEVEL node when it is a logical AND.
 * - If the top-level node is not a logical AND, `startChildIndex` is ignored and
 *   the full condition is evaluated as-is (cannot split a single predicate or OR/NOT).
 * - Returns `false` immediately if any evaluated child evaluates to false (AND semantics).
 * - Returns `true` only when all children from `startChildIndex` onwards pass.
 *
 * This function is intentionally isolated and pure — it does NOT touch any async
 * resources, making it safe to slot into future batch-processing pipelines.
 */
export function evaluateConditionFromIndex(
    node: ConditionNode,
    ctx: any,
    startChildIndex: number,
): boolean {
    if (
        node.type === 'logical' &&
        node.operator === 'AND' &&
        startChildIndex > 0
    ) {
        const { children } = node;
        // Only evaluate children from startChildIndex onwards
        for (let i = startChildIndex; i < children.length; i++) {
            const child = children[i]!;
            if (!evaluateCondition(child, ctx)) {
                return false;
            }
        }
        return true;
    }

    // For all other node types or startChildIndex === 0, fall through to full evaluation
    return evaluateCondition(node, ctx);
}
