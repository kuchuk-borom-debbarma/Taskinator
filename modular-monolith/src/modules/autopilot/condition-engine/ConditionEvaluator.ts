/**
 * @file ConditionEvaluator.ts
 * @description Recursive evaluator and Natural Language generator for Condition ASTs.
 * Handles boolean logic, field comparisons, and change detection.
 *
 * @mandate COND-02, COND-04, COND-05
 */

import { ModularOperatorRegistry } from './OperatorRegistry.js';
import {
    type ConditionAST,
    type ConditionBranch,
    type ConditionLeaf,
    type EvaluationContext,
    isConditionBranch,
    isConditionLeaf,
} from './types.js';

/**
 * Recursively evaluates a Condition AST against a given context.
 *
 * @param ast The condition AST to evaluate.
 * @param context The current and previous state context.
 * @returns boolean indicating if the condition is met.
 */
export function evaluateCondition(
    ast: ConditionAST,
    context: EvaluationContext,
): boolean {
    if (isConditionLeaf(ast)) {
        return evaluateLeaf(ast, context);
    }
    if (isConditionBranch(ast)) {
        return evaluateBranch(ast, context);
    }
    throw new Error('Invalid Condition AST: Neither Leaf nor Branch');
}

/**
 * Evaluates a single comparison leaf.
 */
function evaluateLeaf(
    leaf: ConditionLeaf,
    context: EvaluationContext,
): boolean {
    const { field, operator, value: expected } = leaf;
    const isVal = context.is[field];
    const wasVal = context.was ? context.was[field] : undefined;

    return ModularOperatorRegistry.evaluate(operator, isVal, wasVal, expected);
}

/**
 * Evaluates a composite logic branch.
 */
function evaluateBranch(
    branch: ConditionBranch,
    context: EvaluationContext,
): boolean {
    const { logic, terms } = branch;

    switch (logic) {
        case 'AND':
            // All terms must be true
            return terms.every((term) => evaluateCondition(term, context));
        case 'OR':
            // At least one term must be true
            return terms.some((term) => evaluateCondition(term, context));
        case 'NOT':
            // The first term must be false (NOT usually has one term)
            if (terms.length === 0) return true;
            return !evaluateCondition(terms[0], context);
        default:
            throw new Error(`Unsupported logic operator: ${logic}`);
    }
}

/**
 * Converts a Condition AST into a human-readable Natural Language string.
 *
 * @param ast The condition AST to convert.
 * @returns A string representation of the logic.
 */
export function toNaturalLanguage(ast: ConditionAST): string {
    if (isConditionLeaf(ast)) {
        return leafToNL(ast);
    }
    if (isConditionBranch(ast)) {
        return branchToNL(ast);
    }
    return 'Unknown condition';
}

/**
 * Maps operators to NL fragments.
 */
const OPERATOR_NL: Record<string, string> = {
    eq: 'is',
    neq: 'is not',
    gt: 'is greater than',
    lt: 'is less than',
    gte: 'is greater than or equal to',
    lte: 'is less than or equal to',
    in: 'is one of',
    contains: 'contains',
    empty: 'is empty',
    exists: 'exists',
    changed: 'changed',
    changedTo: 'changed to',
    changedFrom: 'changed from',
};

function leafToNL(leaf: ConditionLeaf): string {
    const { field, operator, value } = leaf;
    const opStr = OPERATOR_NL[operator] || operator;

    if (operator === 'changed') {
        return `${field} ${opStr}`;
    }

    if (operator === 'exists' || operator === 'empty') {
        return `${field} ${opStr}`;
    }

    return `${field} ${opStr} ${value}`;
}

function branchToNL(branch: ConditionBranch): string {
    const { logic, terms } = branch;

    if (logic === 'NOT') {
        return `NOT ${toNaturalLanguage(terms[0])}`;
    }

    const joiner = ` ${logic} `;
    const inner = terms.map((term) => toNaturalLanguage(term)).join(joiner);
    return `(${inner})`;
}
