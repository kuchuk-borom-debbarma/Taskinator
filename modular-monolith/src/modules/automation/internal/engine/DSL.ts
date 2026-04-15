export type Operator =
    // Equality & Comparison
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'GREATER_THAN'
    | 'LESS_THAN'

    // Arrays
    | 'IN'
    | 'NOT_IN'
    | 'CONTAINS'

    // State Deltas (The Engine's Superpowers)
    | 'HAS_CHANGED' // Evaluates true if this field was modified in the event at all
    | 'CHANGED_TO' // Evaluates true if the field changed specifically to 'value'
    | 'CHANGED_FROM' // Evaluates true if the field was previously 'value'

    // Existence
    | 'IS_NULL'
    | 'IS_NOT_NULL';

export interface Condition {
    field: string;
    op: Operator;
    value?: any;
}

export interface RuleGroup {
    operator: 'AND' | 'OR'; // AND = match all, OR = match any
    rules: (Condition | RuleGroup)[]; // An array of checks or sub-groups
}

export type TargetDirection =
    | '@self' // Apply to the entity that triggered the event
    | 'SPECIFIC_TASKS'; // Apply to explicit UUIDs provided in `targetIds`

export type ActionType = 'UPDATE_TASK'; // Start simple. Only mutate Task state.

export interface Action {
    type: ActionType;
    target: TargetDirection;
    targetIds?: string[]; // Array of taskIds when target is 'SPECIFIC_TASKS'
    params: Record<string, any>; // The delta update payload, e.g. { status: "DONE" }
    shouldPropagate?: boolean; // Default: true. (If false, prevents dead-loops by muting triggers)
}

export interface Rule {
    when: RuleGroup; // The root logic pattern
    then: Action[]; // Executed sequentially if `when` evaluates to TRUE
}

export type AutomationPayload = Rule[];

/**
 * Carries execution context through the entire cascade chain.
 * correlationId traces a full chain across multiple events.
 * depth increments on each cascade hop — capped at MAX_CASCADE_DEPTH.
 */
export interface DispatchContext {
    triggerTaskId: string;
    projectId: string;
    correlationId: string;
    depth: number;
}

export const MAX_CASCADE_DEPTH = 5;
