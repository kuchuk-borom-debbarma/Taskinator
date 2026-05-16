/**
 * @file types.ts
 * @description Core type definitions for the Autopilot Condition Engine.
 * Implements a Field-Op-Value AST with support for boolean composition.
 *
 * @mandate COND-02, COND-05
 */

/**
 * Supported boolean logic operators for composing conditions.
 */
export type LogicOperator = 'AND' | 'OR' | 'NOT';

/**
 * A leaf node in the Condition AST representing a single comparison.
 * Format: [Field] [Operator] [Value]
 */
export interface ConditionLeaf {
    /** The field name to evaluate (e.g., 'status', 'priority') */
    field: string;
    /** The operator key (e.g., 'eq', 'changed', 'gt') */
    operator: string;
    /** The expected value to compare against (optional for some operators like 'changed') */
    value?: any;
}

/**
 * A branch node in the Condition AST representing logical composition.
 */
export interface ConditionBranch {
    /** The logical operator to apply to the terms */
    logic: LogicOperator;
    /** The list of conditions (leaves or branches) to compose */
    terms: ConditionAST[];
}

/**
 * The Abstract Syntax Tree (AST) for a condition.
 * Can be a single comparison (Leaf) or a composite logic block (Branch).
 */
export type ConditionAST = ConditionLeaf | ConditionBranch;

/**
 * Type guard to check if a node is a Leaf.
 */
export function isConditionLeaf(ast: ConditionAST): ast is ConditionLeaf {
    return (ast as ConditionLeaf).field !== undefined;
}

/**
 * Type guard to check if a node is a Branch.
 */
export function isConditionBranch(ast: ConditionAST): ast is ConditionBranch {
    return (ast as ConditionBranch).logic !== undefined;
}

/**
 * The context against which conditions are evaluated.
 * Uses a 'Contextual Diff' pattern to support change detection.
 */
export interface EvaluationContext {
    /** The current state of the entity (e.g., after an update) */
    is: Record<string, any>;
    /** The previous state of the entity (e.g., before an update) */
    was?: Record<string, any>;
    /** Optional metadata about the event (timestamp, user, etc.) */
    metadata?: Record<string, any>;
}

/**
 * Signature for an operator evaluation function.
 *
 * @param isVal The current value of the field.
 * @param wasVal The previous value of the field (if available).
 * @param expected The expected value defined in the condition.
 * @returns boolean indicating if the comparison matches.
 */
export type OperatorFn = (isVal: any, wasVal: any, expected: any) => boolean;
