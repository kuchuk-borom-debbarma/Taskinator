export type Operator = 
    | '==' 
    | '!=' 
    | '>' 
    | '<' 
    | 'contains' 
    | 'is_null' 
    | 'changed' 
    | 'changed_to' 
    | 'changed_from';

export interface Predicate {
    field: string;
    op: Operator;
    value: any;
}

export interface ConditionGroup {
    all?: (Predicate | ConditionGroup)[];
    any?: (Predicate | ConditionGroup)[];
}

export interface EvaluationContext {
    updates: Record<string, any>;
    oldState: Record<string, any>;
    newState: Record<string, any>;
    depth: number;
}

export class ConditionEvaluator {
    /**
     * Evaluates a condition tree against the provided task context.
     * This is a pure function designed for high performance (10k RPS).
     */
    evaluate(condition: Predicate | ConditionGroup, context: EvaluationContext): boolean {
        if ('all' in condition && condition.all) {
            return condition.all.every(c => this.evaluate(c, context));
        }

        if ('any' in condition && condition.any) {
            return condition.any.some(c => this.evaluate(c, context));
        }

        return this.evaluatePredicate(condition as Predicate, context);
    }

    private evaluatePredicate(predicate: Predicate, context: EvaluationContext): boolean {
        const { field, op, value } = predicate;
        const { updates, oldState, newState } = context;

        // NEW state is the primary source for standard comparisons
        const currentVal = newState[field];
        const oldVal = oldState[field];
        const isUpdated = updates.hasOwnProperty(field) || updates.hasOwnProperty(this.mapKeyToColumn(field));

        switch (op) {
            case '==':
                return currentVal === value;
            case '!=':
                return currentVal !== value;
            case '>':
                return currentVal > value;
            case '<':
                return currentVal < value;
            case 'contains':
                return Array.isArray(currentVal) ? currentVal.includes(value) : String(currentVal).includes(String(value));
            case 'is_null':
                return currentVal === null || currentVal === undefined;
            case 'changed':
                return isUpdated;
            case 'changed_to':
                return isUpdated && currentVal === value;
            case 'changed_from':
                return isUpdated && oldVal === value;
            default:
                return false;
        }
    }

    /**
     * Maps camelCase JS keys to snake_case DB columns if necessary.
     * The event payload might use either depending on how it's serialized.
     */
    private mapKeyToColumn(key: string): string {
        return key.replace(/([A-Z])/g, "_$1").toLowerCase();
    }
}

export const conditionEvaluator = new ConditionEvaluator();
