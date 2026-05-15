import type { ConditionNode, Predicate } from './ConditionTypes';

export type EvaluationContext = Record<string, any>;

export class ConditionEvaluator {
    evaluate(node: ConditionNode, context: EvaluationContext): boolean {
        switch (node.type) {
            case 'and':
                return node.children.every((child) =>
                    this.evaluate(child, context),
                );
            case 'or':
                return node.children.some((child) =>
                    this.evaluate(child, context),
                );
            case 'not':
                return !this.evaluate(node.child, context);
            case 'predicate':
                return this.evaluatePredicate(node, context);
            default:
                throw new Error(
                    `Unknown condition node type: ${(node as any).type}`,
                );
        }
    }

    private evaluatePredicate(
        predicate: Predicate,
        context: EvaluationContext,
    ): boolean {
        const key = `${predicate.domain}:${predicate.field}`;
        const actualValue = context[key];

        switch (predicate.operator) {
            case 'eq':
                return actualValue === predicate.value;
            case 'neq':
                return actualValue !== predicate.value;
            case 'gt':
                return actualValue > predicate.value;
            case 'gte':
                return actualValue >= predicate.value;
            case 'lt':
                return actualValue < predicate.value;
            case 'lte':
                return actualValue <= predicate.value;
            case 'in':
                return (
                    Array.isArray(predicate.value) &&
                    predicate.value.includes(actualValue)
                );
            case 'nin':
                return (
                    Array.isArray(predicate.value) &&
                    !predicate.value.includes(actualValue)
                );
            case 'changed':
                // For 'changed', the context should provide both old and new values.
                // For Phase 1, we assume the context has a 'domain:field:changed' boolean flag.
                return !!context[`${key}:changed`];
            default:
                throw new Error(
                    `Unknown predicate operator: ${predicate.operator}`,
                );
        }
    }
}
