import type { ConditionDefinition, ConditionNode } from './types.js';

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
