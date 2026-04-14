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
    | 'HAS_CHANGED'       // Evaluates true if this field was modified in the event at all
    | 'CHANGED_TO'        // Evaluates true if the field changed specifically to 'value'
    | 'CHANGED_FROM'      // Evaluates true if the field was previously 'value'
    
    // Existence
    | 'IS_NULL' 
    | 'IS_NOT_NULL';

export interface Condition {
    field: string;
    op: Operator;
    value?: any; 
}

export interface RuleGroup {
    match: 'ALL' | 'ANY';                     // ALL = AND, ANY = OR
    conditions: (Condition | RuleGroup)[];     // An array of checks or sub-groups
}

export type TargetDirection = 
    | '@self'            // Apply to the entity that triggered the event
    | '@parent'          // Apply to the immediate parent task
    | '@children'        // Apply to immediate (direct) sub-tasks
    | '@descendants'     // Apply to ALL nested sub-tasks down the tree
    | 'SPECIFIC_TASKS';  // Apply to explicit UUIDs provided in `targetIds`

export type ActionType = 'UPDATE_TASK'; // Start simple. Only mutate Task state.

export interface Action {
    type: ActionType;
    target: TargetDirection;
    targetIds?: string[];        // Array of taskIds when target is 'SPECIFIC_TASKS'
    params: Record<string, any>; // The delta update payload, e.g. { status: "DONE" }
    shouldPropagate?: boolean;   // Default: true. (If false, prevents dead-loops by muting triggers)
}

export interface Rule {
    when: RuleGroup;     // The root logic pattern
    then: Action[];      // Executed sequentially if `when` evaluates to TRUE
}

export type AutomationPayload = Rule[];
