import { describe, expect, it } from '@jest/globals';
import { getConditionHash } from './ConditionHasher.js';
import type { ConditionAST } from './types.js';

describe('ConditionHasher', () => {
    it('should produce identical hashes for identical conditions', () => {
        const cond1: ConditionAST = {
            field: 'status',
            operator: 'eq',
            value: 'DONE',
        };
        const cond2: ConditionAST = {
            field: 'status',
            operator: 'eq',
            value: 'DONE',
        };

        expect(getConditionHash(cond1)).toBe(getConditionHash(cond2));
    });

    it('should produce identical hashes regardless of key order', () => {
        const cond1 = {
            field: 'status',
            operator: 'eq',
            value: 'DONE',
        } as ConditionAST;
        const cond2 = {
            operator: 'eq',
            value: 'DONE',
            field: 'status',
        } as any as ConditionAST;

        expect(getConditionHash(cond1)).toBe(getConditionHash(cond2));
    });

    it('should produce different hashes for different conditions', () => {
        const cond1: ConditionAST = {
            field: 'status',
            operator: 'eq',
            value: 'DONE',
        };
        const cond2: ConditionAST = {
            field: 'status',
            operator: 'eq',
            value: 'TODO',
        };

        expect(getConditionHash(cond1)).not.toBe(getConditionHash(cond2));
    });

    it('should handle complex nested conditions deterministically', () => {
        const cond1: ConditionAST = {
            logic: 'AND',
            terms: [
                { field: 'priority', operator: 'gt', value: 1 },
                {
                    logic: 'OR',
                    terms: [{ field: 'status', operator: 'eq', value: 'DONE' }],
                },
            ],
        };

        const cond2: ConditionAST = {
            logic: 'AND',
            terms: [
                { field: 'priority', operator: 'gt', value: 1 },
                {
                    logic: 'OR',
                    terms: [{ field: 'status', operator: 'eq', value: 'DONE' }],
                },
            ],
        };

        expect(getConditionHash(cond1)).toBe(getConditionHash(cond2));
    });
});
