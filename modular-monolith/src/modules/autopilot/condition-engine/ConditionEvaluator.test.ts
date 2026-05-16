import { describe, expect, it } from '@jest/globals';
import { evaluateCondition, toNaturalLanguage } from './ConditionEvaluator.js';
import type { ConditionAST, EvaluationContext } from './types.js';

describe('ConditionEvaluator', () => {
    describe('evaluateCondition', () => {
        it('should evaluate Leaf eq correctly', () => {
            const ast: ConditionAST = {
                field: 'status',
                operator: 'eq',
                value: 'DONE',
            };
            const context: EvaluationContext = { is: { status: 'DONE' } };
            expect(evaluateCondition(ast, context)).toBe(true);

            const context2: EvaluationContext = { is: { status: 'TODO' } };
            expect(evaluateCondition(ast, context2)).toBe(false);
        });

        it('should evaluate Leaf changed correctly', () => {
            const ast: ConditionAST = {
                field: 'priority',
                operator: 'changed',
            };
            const context: EvaluationContext = {
                is: { priority: 1 },
                was: { priority: 2 },
            };
            expect(evaluateCondition(ast, context)).toBe(true);

            const context2: EvaluationContext = {
                is: { priority: 1 },
                was: { priority: 1 },
            };
            expect(evaluateCondition(ast, context2)).toBe(false);
        });

        it('should evaluate logic AND correctly', () => {
            const ast: ConditionAST = {
                logic: 'AND',
                terms: [
                    { field: 'status', operator: 'eq', value: 'DONE' },
                    { field: 'priority', operator: 'gt', value: 1 },
                ],
            };
            expect(
                evaluateCondition(ast, { is: { status: 'DONE', priority: 2 } }),
            ).toBe(true);
            expect(
                evaluateCondition(ast, { is: { status: 'DONE', priority: 1 } }),
            ).toBe(false);
        });

        it('should evaluate logic OR correctly', () => {
            const ast: ConditionAST = {
                logic: 'OR',
                terms: [
                    { field: 'status', operator: 'eq', value: 'DONE' },
                    { field: 'priority', operator: 'gt', value: 1 },
                ],
            };
            expect(
                evaluateCondition(ast, { is: { status: 'DONE', priority: 1 } }),
            ).toBe(true);
            expect(
                evaluateCondition(ast, { is: { status: 'TODO', priority: 2 } }),
            ).toBe(true);
            expect(
                evaluateCondition(ast, { is: { status: 'TODO', priority: 1 } }),
            ).toBe(false);
        });

        it('should evaluate logic NOT correctly', () => {
            const ast: ConditionAST = {
                logic: 'NOT',
                terms: [{ field: 'status', operator: 'eq', value: 'DONE' }],
            };
            expect(evaluateCondition(ast, { is: { status: 'TODO' } })).toBe(
                true,
            );
            expect(evaluateCondition(ast, { is: { status: 'DONE' } })).toBe(
                false,
            );
        });
    });

    describe('toNaturalLanguage', () => {
        it('should generate NL for Leaf eq', () => {
            const ast: ConditionAST = {
                field: 'status',
                operator: 'eq',
                value: 'DONE',
            };
            expect(toNaturalLanguage(ast)).toBe('status is DONE');
        });

        it('should generate NL for Leaf changed', () => {
            const ast: ConditionAST = {
                field: 'priority',
                operator: 'changed',
            };
            expect(toNaturalLanguage(ast)).toBe('priority changed');
        });

        it('should generate NL for complex AND', () => {
            const ast: ConditionAST = {
                logic: 'AND',
                terms: [
                    { field: 'status', operator: 'eq', value: 'DONE' },
                    { field: 'priority', operator: 'gt', value: 1 },
                ],
            };
            expect(toNaturalLanguage(ast)).toBe(
                '(status is DONE AND priority is greater than 1)',
            );
        });
    });
});
