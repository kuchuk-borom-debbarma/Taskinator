import { describe, expect, it } from '@jest/globals';
import {
    ConditionEvaluator,
    type EvaluationContext,
} from './ConditionEvaluator';
import type { ConditionNode } from './ConditionTypes';

describe('ConditionEvaluator', () => {
    const evaluator = new ConditionEvaluator();

    it('should evaluate simple equality predicate', () => {
        const node: ConditionNode = {
            type: 'predicate',
            domain: 'task',
            field: 'status',
            operator: 'eq',
            value: 'DONE',
        };
        const context: EvaluationContext = { 'task:status': 'DONE' };
        expect(evaluator.evaluate(node, context)).toBe(true);

        const context2: EvaluationContext = { 'task:status': 'TODO' };
        expect(evaluator.evaluate(node, context2)).toBe(false);
    });

    it('should evaluate AND logic', () => {
        const node: ConditionNode = {
            type: 'and',
            children: [
                {
                    type: 'predicate',
                    domain: 'task',
                    field: 'status',
                    operator: 'eq',
                    value: 'DONE',
                },
                {
                    type: 'predicate',
                    domain: 'task',
                    field: 'priority',
                    operator: 'gt',
                    value: 5,
                },
            ],
        };
        const context: EvaluationContext = {
            'task:status': 'DONE',
            'task:priority': 10,
        };
        expect(evaluator.evaluate(node, context)).toBe(true);

        const context2: EvaluationContext = {
            'task:status': 'DONE',
            'task:priority': 2,
        };
        expect(evaluator.evaluate(node, context2)).toBe(false);
    });

    it('should evaluate OR logic', () => {
        const node: ConditionNode = {
            type: 'or',
            children: [
                {
                    type: 'predicate',
                    domain: 'task',
                    field: 'status',
                    operator: 'eq',
                    value: 'DONE',
                },
                {
                    type: 'predicate',
                    domain: 'task',
                    field: 'priority',
                    operator: 'gt',
                    value: 5,
                },
            ],
        };
        const context: EvaluationContext = {
            'task:status': 'TODO',
            'task:priority': 10,
        };
        expect(evaluator.evaluate(node, context)).toBe(true);

        const context2: EvaluationContext = {
            'task:status': 'TODO',
            'task:priority': 2,
        };
        expect(evaluator.evaluate(node, context2)).toBe(false);
    });

    it('should evaluate NOT logic', () => {
        const node: ConditionNode = {
            type: 'not',
            child: {
                type: 'predicate',
                domain: 'task',
                field: 'status',
                operator: 'eq',
                value: 'DONE',
            },
        };
        const context: EvaluationContext = { 'task:status': 'TODO' };
        expect(evaluator.evaluate(node, context)).toBe(true);

        const context2: EvaluationContext = { 'task:status': 'DONE' };
        expect(evaluator.evaluate(node, context2)).toBe(false);
    });

    it('should evaluate complex nested logic', () => {
        // (status == DONE AND priority > 5) OR (status == IN_PROGRESS)
        const node: ConditionNode = {
            type: 'or',
            children: [
                {
                    type: 'and',
                    children: [
                        {
                            type: 'predicate',
                            domain: 'task',
                            field: 'status',
                            operator: 'eq',
                            value: 'DONE',
                        },
                        {
                            type: 'predicate',
                            domain: 'task',
                            field: 'priority',
                            operator: 'gt',
                            value: 5,
                        },
                    ],
                },
                {
                    type: 'predicate',
                    domain: 'task',
                    field: 'status',
                    operator: 'eq',
                    value: 'IN_PROGRESS',
                },
            ],
        };

        expect(
            evaluator.evaluate(node, {
                'task:status': 'DONE',
                'task:priority': 10,
            }),
        ).toBe(true);
        expect(evaluator.evaluate(node, { 'task:status': 'IN_PROGRESS' })).toBe(
            true,
        );
        expect(
            evaluator.evaluate(node, {
                'task:status': 'TODO',
                'task:priority': 10,
            }),
        ).toBe(false);
    });
});
