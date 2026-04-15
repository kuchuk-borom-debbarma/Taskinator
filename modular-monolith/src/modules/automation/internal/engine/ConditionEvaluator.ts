import type { RuleGroup, Condition, Operator } from './DSL.ts';

export const evaluateRuleGroup = (
    oldState: Record<string, any>,
    newState: Record<string, any>,
    group: RuleGroup,
): boolean => {
    if (!group || !group.rules || group.rules.length === 0) {
        return false;
    }

    if (group.operator === 'AND') {
        // AND logic: Every rule must pass
        for (const item of group.rules) {
            const pass = isRuleGroup(item)
                ? evaluateRuleGroup(oldState, newState, item)
                : evaluateCondition(oldState, newState, item);
            if (!pass) return false;
        }
        return true;
    } else {
        // OR logic: At least one rule must pass
        for (const item of group.rules) {
            const pass = isRuleGroup(item)
                ? evaluateRuleGroup(oldState, newState, item)
                : evaluateCondition(oldState, newState, item);
            if (pass) return true;
        }
        return false;
    }
};

const isRuleGroup = (item: Condition | RuleGroup): item is RuleGroup => {
    return (item as RuleGroup).operator !== undefined;
};

export type OperatorStrategy = (
    oldVal: any,
    newVal: any,
    expectedVal?: any,
) => boolean;

export const OperatorRegistry: Record<Operator, OperatorStrategy> = {
    // Equality
    EQUALS: (_, newVal, expectedVal) => newVal === expectedVal,
    NOT_EQUALS: (_, newVal, expectedVal) => newVal !== expectedVal,
    GREATER_THAN: (_, newVal, expectedVal) => newVal > expectedVal,
    LESS_THAN: (_, newVal, expectedVal) => newVal < expectedVal,

    // Arrays / Strings
    IN: (_, newVal, expectedVal) =>
        Array.isArray(expectedVal) && expectedVal.includes(newVal),
    NOT_IN: (_, newVal, expectedVal) =>
        Array.isArray(expectedVal) && !expectedVal.includes(newVal),
    CONTAINS: (_, newVal, expectedVal) =>
        typeof newVal === 'string' && newVal.includes(expectedVal),

    // Deltas
    HAS_CHANGED: (oldVal, newVal) => oldVal !== newVal,
    CHANGED_TO: (oldVal, newVal, expectedVal) =>
        oldVal !== expectedVal && newVal === expectedVal,
    CHANGED_FROM: (oldVal, newVal, expectedVal) =>
        oldVal === expectedVal && newVal !== expectedVal,

    // Existence
    IS_NULL: (_, newVal) => newVal === null || newVal === undefined,
    IS_NOT_NULL: (_, newVal) => newVal !== null && newVal !== undefined,
};

export const evaluateCondition = (
    oldState: Record<string, any>,
    newState: Record<string, any>,
    condition: Condition,
): boolean => {
    const strategy = OperatorRegistry[condition.op];
    if (!strategy) {
        return false; // Unknown operator gracefully fails
    }

    return strategy(
        oldState[condition.field],
        newState[condition.field],
        condition.value,
    );
};
