import { describe, expect, it } from '@jest/globals';
import { ModularOperatorRegistry } from './OperatorRegistry.js';

describe('ModularOperatorRegistry', () => {
    describe('Standard Operators', () => {
        it('should evaluate eq correctly', () => {
            expect(
                ModularOperatorRegistry.evaluate('eq', 'DONE', null, 'DONE'),
            ).toBe(true);
            expect(
                ModularOperatorRegistry.evaluate('eq', 'TODO', null, 'DONE'),
            ).toBe(false);
        });

        it('should evaluate neq correctly', () => {
            expect(
                ModularOperatorRegistry.evaluate('neq', 'TODO', null, 'DONE'),
            ).toBe(true);
            expect(
                ModularOperatorRegistry.evaluate('neq', 'DONE', null, 'DONE'),
            ).toBe(false);
        });

        it('should evaluate gt, lt, gte, lte correctly', () => {
            expect(ModularOperatorRegistry.evaluate('gt', 10, null, 5)).toBe(
                true,
            );
            expect(ModularOperatorRegistry.evaluate('gt', 5, null, 10)).toBe(
                false,
            );
            expect(ModularOperatorRegistry.evaluate('lt', 5, null, 10)).toBe(
                true,
            );
            expect(ModularOperatorRegistry.evaluate('gte', 10, null, 10)).toBe(
                true,
            );
            expect(ModularOperatorRegistry.evaluate('lte', 10, null, 10)).toBe(
                true,
            );
        });

        it('should evaluate in correctly', () => {
            expect(
                ModularOperatorRegistry.evaluate('in', 'A', null, ['A', 'B']),
            ).toBe(true);
            expect(
                ModularOperatorRegistry.evaluate('in', 'C', null, ['A', 'B']),
            ).toBe(false);
        });

        it('should evaluate contains correctly', () => {
            expect(
                ModularOperatorRegistry.evaluate(
                    'contains',
                    ['A', 'B'],
                    null,
                    'A',
                ),
            ).toBe(true);
            expect(
                ModularOperatorRegistry.evaluate(
                    'contains',
                    ['A', 'B'],
                    null,
                    'C',
                ),
            ).toBe(false);
        });

        it('should evaluate empty correctly', () => {
            expect(
                ModularOperatorRegistry.evaluate('empty', '', null, null),
            ).toBe(true);
            expect(
                ModularOperatorRegistry.evaluate('empty', null, null, null),
            ).toBe(true);
            expect(
                ModularOperatorRegistry.evaluate('empty', [], null, null),
            ).toBe(true);
            expect(
                ModularOperatorRegistry.evaluate('empty', 'hi', null, null),
            ).toBe(false);
        });

        it('should evaluate exists correctly', () => {
            expect(
                ModularOperatorRegistry.evaluate('exists', 'hi', null, null),
            ).toBe(true);
            expect(
                ModularOperatorRegistry.evaluate('exists', null, null, null),
            ).toBe(false);
        });
    });

    describe('Change-based Operators', () => {
        it('should evaluate changed correctly', () => {
            expect(
                ModularOperatorRegistry.evaluate('changed', 2, 1, null),
            ).toBe(true);
            expect(
                ModularOperatorRegistry.evaluate('changed', 1, 1, null),
            ).toBe(false);
        });

        it('should evaluate changedTo correctly', () => {
            expect(
                ModularOperatorRegistry.evaluate(
                    'changedTo',
                    'DONE',
                    'TODO',
                    'DONE',
                ),
            ).toBe(true);
            expect(
                ModularOperatorRegistry.evaluate(
                    'changedTo',
                    'DONE',
                    'DONE',
                    'DONE',
                ),
            ).toBe(false);
            expect(
                ModularOperatorRegistry.evaluate(
                    'changedTo',
                    'IN_PROGRESS',
                    'TODO',
                    'DONE',
                ),
            ).toBe(false);
        });

        it('should evaluate changedFrom correctly', () => {
            expect(
                ModularOperatorRegistry.evaluate(
                    'changedFrom',
                    'DONE',
                    'TODO',
                    'TODO',
                ),
            ).toBe(true);
            expect(
                ModularOperatorRegistry.evaluate(
                    'changedFrom',
                    'TODO',
                    'TODO',
                    'TODO',
                ),
            ).toBe(false);
            expect(
                ModularOperatorRegistry.evaluate(
                    'changedFrom',
                    'DONE',
                    'IN_PROGRESS',
                    'TODO',
                ),
            ).toBe(false);
        });
    });

    it('should throw on unsupported operator', () => {
        expect(() =>
            ModularOperatorRegistry.evaluate('invalid', 1, null, 1),
        ).toThrow('Unsupported operator: invalid');
    });
});
