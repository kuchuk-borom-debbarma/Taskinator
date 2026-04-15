import { describe, it, expect } from '@jest/globals';
import { evaluateRuleGroup } from '../modules/automation/internal/engine/ConditionEvaluator.ts';
import type { RuleGroup } from '../modules/automation/internal/engine/DSL.ts';

describe('ConditionEvaluator — Unit Tests', () => {

    // ─────────────────────────────────────────────────────────────────────────
    // Equality Operators
    // ─────────────────────────────────────────────────────────────────────────

    describe('EQUALS / NOT_EQUALS', () => {
        it('EQUALS matches exact value on newState', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'status', op: 'EQUALS', value: 'DONE' }] };
            expect(evaluateRuleGroup({}, { status: 'DONE' }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { status: 'TODO' }, group)).toBe(false);
        });

        it('NOT_EQUALS passes when value differs', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'status', op: 'NOT_EQUALS', value: 'DONE' }] };
            expect(evaluateRuleGroup({}, { status: 'TODO' }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { status: 'DONE' }, group)).toBe(false);
        });
    });

    describe('GREATER_THAN / LESS_THAN', () => {
        it('GREATER_THAN compares numeric values', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'score', op: 'GREATER_THAN', value: 5 }] };
            expect(evaluateRuleGroup({}, { score: 10 }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { score: 5 }, group)).toBe(false);
            expect(evaluateRuleGroup({}, { score: 3 }, group)).toBe(false);
        });

        it('LESS_THAN compares numeric values', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'score', op: 'LESS_THAN', value: 5 }] };
            expect(evaluateRuleGroup({}, { score: 3 }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { score: 5 }, group)).toBe(false);
            expect(evaluateRuleGroup({}, { score: 10 }, group)).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Array / String Operators
    // ─────────────────────────────────────────────────────────────────────────

    describe('IN / NOT_IN / CONTAINS', () => {
        it('IN matches when newVal is in the array', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'status', op: 'IN', value: ['DONE', 'REVIEW'] }] };
            expect(evaluateRuleGroup({}, { status: 'DONE' }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { status: 'REVIEW' }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { status: 'TODO' }, group)).toBe(false);
        });

        it('NOT_IN passes when newVal is absent from array', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'status', op: 'NOT_IN', value: ['DONE', 'REVIEW'] }] };
            expect(evaluateRuleGroup({}, { status: 'TODO' }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { status: 'DONE' }, group)).toBe(false);
        });

        it('CONTAINS checks substring presence', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'title', op: 'CONTAINS', value: 'urgent' }] };
            expect(evaluateRuleGroup({}, { title: 'This is urgent!' }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { title: 'Normal task' }, group)).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // State Delta Operators
    // ─────────────────────────────────────────────────────────────────────────

    describe('HAS_CHANGED', () => {
        it('passes when old and new value differ', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'priority', op: 'HAS_CHANGED' }] };
            expect(evaluateRuleGroup({ priority: 'LOW' }, { priority: 'HIGH' }, group)).toBe(true);
            expect(evaluateRuleGroup({ priority: null }, { priority: 'HIGH' }, group)).toBe(true);
        });

        it('fails when old and new value are identical', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'priority', op: 'HAS_CHANGED' }] };
            expect(evaluateRuleGroup({ priority: 'LOW' }, { priority: 'LOW' }, group)).toBe(false);
            expect(evaluateRuleGroup({ priority: null }, { priority: null }, group)).toBe(false);
        });
    });

    describe('CHANGED_TO', () => {
        it('passes only on the exact transition TO value', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'status', op: 'CHANGED_TO', value: 'REVIEW' }] };
            expect(evaluateRuleGroup({ status: 'IN_PROGRESS' }, { status: 'REVIEW' }, group)).toBe(true);
        });

        it('fails if it was already at the target value (no real transition)', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'status', op: 'CHANGED_TO', value: 'REVIEW' }] };
            expect(evaluateRuleGroup({ status: 'REVIEW' }, { status: 'REVIEW' }, group)).toBe(false);
        });

        it('fails if it changed to a different value', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'status', op: 'CHANGED_TO', value: 'REVIEW' }] };
            expect(evaluateRuleGroup({ status: 'TODO' }, { status: 'DONE' }, group)).toBe(false);
        });
    });

    describe('CHANGED_FROM', () => {
        it('passes only when the old value matches exactly', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'status', op: 'CHANGED_FROM', value: 'TODO' }] };
            expect(evaluateRuleGroup({ status: 'TODO' }, { status: 'IN_PROGRESS' }, group)).toBe(true);
        });

        it('fails when old value does not match', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'status', op: 'CHANGED_FROM', value: 'TODO' }] };
            expect(evaluateRuleGroup({ status: 'IN_PROGRESS' }, { status: 'DONE' }, group)).toBe(false);
        });

        it('fails when old and new are both the target value (no change)', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'status', op: 'CHANGED_FROM', value: 'TODO' }] };
            expect(evaluateRuleGroup({ status: 'TODO' }, { status: 'TODO' }, group)).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Existence Operators
    // ─────────────────────────────────────────────────────────────────────────

    describe('IS_NULL / IS_NOT_NULL', () => {
        it('IS_NULL passes for null and undefined', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'memberId', op: 'IS_NULL' }] };
            expect(evaluateRuleGroup({}, { memberId: null }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { memberId: undefined }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { memberId: 'user-1' }, group)).toBe(false);
        });

        it('IS_NOT_NULL passes when value is present', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'memberId', op: 'IS_NOT_NULL' }] };
            expect(evaluateRuleGroup({}, { memberId: 'user-1' }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { memberId: null }, group)).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Logical Group Evaluation (ALL / ANY nesting)
    // ─────────────────────────────────────────────────────────────────────────

    describe('RuleGroup — ALL / ANY logic', () => {
        it('ALL short-circuits on first failure', () => {
            const group: RuleGroup = {
                match: 'ALL',
                conditions: [
                    { field: 'status', op: 'EQUALS', value: 'DONE' },
                    { field: 'priority', op: 'EQUALS', value: 'HIGH' },
                ],
            };
            // Both pass
            expect(evaluateRuleGroup({}, { status: 'DONE', priority: 'HIGH' }, group)).toBe(true);
            // First fails — second is irrelevant
            expect(evaluateRuleGroup({}, { status: 'TODO', priority: 'HIGH' }, group)).toBe(false);
            // Second fails
            expect(evaluateRuleGroup({}, { status: 'DONE', priority: 'LOW' }, group)).toBe(false);
        });

        it('ANY passes when at least one condition is true', () => {
            const group: RuleGroup = {
                match: 'ANY',
                conditions: [
                    { field: 'status', op: 'EQUALS', value: 'DONE' },
                    { field: 'priority', op: 'EQUALS', value: 'HIGH' },
                ],
            };
            expect(evaluateRuleGroup({}, { status: 'DONE', priority: 'LOW' }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { status: 'TODO', priority: 'HIGH' }, group)).toBe(true);
            expect(evaluateRuleGroup({}, { status: 'TODO', priority: 'LOW' }, group)).toBe(false);
        });

        it('nested ALL inside ANY evaluates correctly', () => {
            const group: RuleGroup = {
                match: 'ANY',
                conditions: [
                    // Option A: status is DONE
                    { field: 'status', op: 'EQUALS', value: 'DONE' },
                    // Option B: priority HIGH AND assigned
                    {
                        match: 'ALL',
                        conditions: [
                            { field: 'priority', op: 'EQUALS', value: 'HIGH' },
                            { field: 'memberId', op: 'IS_NOT_NULL' },
                        ],
                    },
                ],
            };
            // Option A matches
            expect(evaluateRuleGroup({}, { status: 'DONE', priority: 'LOW', memberId: null }, group)).toBe(true);
            // Option B matches (both inner conditions pass)
            expect(evaluateRuleGroup({}, { status: 'TODO', priority: 'HIGH', memberId: 'u1' }, group)).toBe(true);
            // Option B almost: high priority but not assigned
            expect(evaluateRuleGroup({}, { status: 'TODO', priority: 'HIGH', memberId: null }, group)).toBe(false);
        });

        it('nested ANY inside ALL evaluates correctly', () => {
            const group: RuleGroup = {
                match: 'ALL',
                conditions: [
                    { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    {
                        match: 'ANY',
                        conditions: [
                            { field: 'priority', op: 'EQUALS', value: 'HIGH' },
                            { field: 'memberId', op: 'IS_NULL' },
                        ],
                    },
                ],
            };
            // status changes + priority is high → pass
            expect(evaluateRuleGroup({ status: 'TODO' }, { status: 'DONE', priority: 'HIGH', memberId: 'u1' }, group)).toBe(true);
            // status changes + no member → pass
            expect(evaluateRuleGroup({ status: 'TODO' }, { status: 'DONE', priority: 'LOW', memberId: null }, group)).toBe(true);
            // status changes but neither inner condition passes
            expect(evaluateRuleGroup({ status: 'TODO' }, { status: 'DONE', priority: 'LOW', memberId: 'u1' }, group)).toBe(false);
            // outer condition fails (no transition)
            expect(evaluateRuleGroup({ status: 'DONE' }, { status: 'DONE', priority: 'HIGH', memberId: null }, group)).toBe(false);
        });

        it('3-level nesting evaluates correctly', () => {
            const group: RuleGroup = {
                match: 'ALL', // L1
                conditions: [
                    { field: 'status', op: 'EQUALS', value: 'DONE' },
                    {
                        match: 'ANY', // L2
                        conditions: [
                            { field: 'priority', op: 'EQUALS', value: 'HIGH' },
                            {
                                match: 'ALL', // L3
                                conditions: [
                                    { field: 'memberId', op: 'IS_NOT_NULL' },
                                    { field: 'teamId', op: 'IS_NOT_NULL' },
                                ],
                            },
                        ],
                    },
                ],
            };
            // L3 satisfies L2 which satisfies L1
            expect(evaluateRuleGroup({}, { status: 'DONE', priority: 'LOW', memberId: 'u1', teamId: 't1' }, group)).toBe(true);
            // L2 direct condition satisfies
            expect(evaluateRuleGroup({}, { status: 'DONE', priority: 'HIGH', memberId: null, teamId: null }, group)).toBe(true);
            // L3 partial failure (teamId missing)
            expect(evaluateRuleGroup({}, { status: 'DONE', priority: 'LOW', memberId: 'u1', teamId: null }, group)).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Edge Cases
    // ─────────────────────────────────────────────────────────────────────────

    describe('Edge Cases', () => {
        it('returns false for an empty conditions array', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [] };
            expect(evaluateRuleGroup({}, { status: 'DONE' }, group)).toBe(false);
        });

        it('unknown operator returns false gracefully (no throw)', () => {
            const group = {
                match: 'ALL' as const,
                conditions: [{ field: 'status', op: 'UNKNOWN_OP' as any, value: 'DONE' }],
            };
            expect(() => evaluateRuleGroup({}, { status: 'DONE' }, group)).not.toThrow();
            expect(evaluateRuleGroup({}, { status: 'DONE' }, group)).toBe(false);
        });

        it('handles missing field on newState gracefully', () => {
            const group: RuleGroup = { match: 'ALL', conditions: [{ field: 'priority', op: 'IS_NULL' }] };
            // priority is undefined on newState — IS_NULL should still pass
            expect(evaluateRuleGroup({}, {}, group)).toBe(true);
        });
    });

});
