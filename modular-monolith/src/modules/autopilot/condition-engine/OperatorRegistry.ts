/**
 * @file OperatorRegistry.ts
 * @description Registry of all comparison and change-based operators.
 * Implements a modular lookup for operator evaluation functions.
 *
 * @mandate COND-03, COND-05
 */

import type { OperatorFn } from './types.js';

/**
 * Modular registry for condition operators.
 * Centralizes comparison logic for easy extension.
 */
export class ModularOperatorRegistry {
    private static operators: Map<string, OperatorFn> = new Map();

    /**
     * Evaluates an operator against current and previous values.
     */
    static evaluate(
        operator: string,
        isVal: any,
        wasVal: any,
        expected: any,
    ): boolean {
        const fn = ModularOperatorRegistry.operators.get(operator);
        if (!fn) {
            throw new Error(`Unsupported operator: ${operator}`);
        }
        return fn(isVal, wasVal, expected);
    }

    /**
     * Registers a new operator.
     */
    static register(operator: string, fn: OperatorFn): void {
        ModularOperatorRegistry.operators.set(operator, fn);
    }

    /**
     * Standard Comparison Operators
     */
    static {
        // Equality
        ModularOperatorRegistry.register('eq', (is, _, exp) => is === exp);
        ModularOperatorRegistry.register('neq', (is, _, exp) => is !== exp);

        // Numeric Comparisons
        ModularOperatorRegistry.register(
            'gt',
            (is, _, exp) => typeof is === 'number' && is > exp,
        );
        ModularOperatorRegistry.register(
            'lt',
            (is, _, exp) => typeof is === 'number' && is < exp,
        );
        ModularOperatorRegistry.register(
            'gte',
            (is, _, exp) => typeof is === 'number' && is >= exp,
        );
        ModularOperatorRegistry.register(
            'lte',
            (is, _, exp) => typeof is === 'number' && is <= exp,
        );

        // Set / Collection
        ModularOperatorRegistry.register(
            'in',
            (is, _, exp) => Array.isArray(exp) && exp.includes(is),
        );
        ModularOperatorRegistry.register(
            'contains',
            (is, _, exp) => Array.isArray(is) && is.includes(exp),
        );

        // Nullability / Existence
        ModularOperatorRegistry.register(
            'empty',
            (is) =>
                is === null ||
                is === undefined ||
                is === '' ||
                (Array.isArray(is) && is.length === 0),
        );
        ModularOperatorRegistry.register(
            'exists',
            (is) => is !== null && is !== undefined,
        );

        /**
         * Change-based Operators (COND-03)
         */

        // Any change occurred
        ModularOperatorRegistry.register('changed', (is, was) => is !== was);

        // Specifically changed to a value
        ModularOperatorRegistry.register(
            'changedTo',
            (is, was, exp) => is === exp && was !== exp,
        );

        // Specifically changed from a value
        ModularOperatorRegistry.register(
            'changedFrom',
            (is, was, exp) => was === exp && is !== exp,
        );
    }
}
