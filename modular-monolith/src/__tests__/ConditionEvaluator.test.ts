import { describe, it, expect } from 'vitest';
import { evaluateRuleGroup } from '../modules/automation/internal/engine/ConditionEvaluator.ts';
import type { RuleGroup } from '../modules/automation/internal/engine/DSL.ts';

describe('ConditionEvaluator', () => {
    
    it('evaluates simple EQUALS condition correctly', () => {
        const group: RuleGroup = {
            match: 'ALL',
            conditions: [
                { field: 'status', op: 'EQUALS', value: 'DONE' }
            ]
        };

        expect(evaluateRuleGroup({}, { status: 'DONE' }, group)).toBe(true);
        expect(evaluateRuleGroup({}, { status: 'TODO' }, group)).toBe(false);
    });

    it('handles HAS_CHANGED independent of values', () => {
        const group: RuleGroup = {
            match: 'ALL',
            conditions: [
                { field: 'priority', op: 'HAS_CHANGED' }
            ]
        };

        // Old was LOW, New is HIGH -> Changed!
        expect(evaluateRuleGroup({ priority: 'LOW' }, { priority: 'HIGH' }, group)).toBe(true);
        // Old was LOW, New is LOW -> Not changed
        expect(evaluateRuleGroup({ priority: 'LOW' }, { priority: 'LOW' }, group)).toBe(false);
        // Was null, became HIGH -> Changed!
        expect(evaluateRuleGroup({ priority: null }, { priority: 'HIGH' }, group)).toBe(true);
    });

    it('evaluates complex CHANGED_TO logic properly', () => {
        const group: RuleGroup = {
            match: 'ALL',
            conditions: [
                { field: 'status', op: 'CHANGED_TO', value: 'REVIEW' }
            ]
        };

        // Trigger should fire ON the transition
        expect(evaluateRuleGroup({ status: 'IN_PROGRESS' }, { status: 'REVIEW' }, group)).toBe(true);
        // Should NOT fire if it was already REVIEW and was updated for another reason
        expect(evaluateRuleGroup({ status: 'REVIEW' }, { status: 'REVIEW' }, group)).toBe(false);
        // Should NOT fire if it changed to DONE
        expect(evaluateRuleGroup({ status: 'IN_PROGRESS' }, { status: 'DONE' }, group)).toBe(false);
    });

    it('handles nested ANY / ALL blocks flawlessly', () => {
        const group: RuleGroup = {
            match: 'ALL',
            conditions: [
                { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                {
                    match: 'ANY',
                    conditions: [
                        { field: 'priority', op: 'EQUALS', value: 'HIGH' },
                        { field: 'isFlagged', op: 'EQUALS', value: true }
                    ]
                }
            ]
        };

        // Base matching ALL passes, but neither nested ANY passes
        expect(evaluateRuleGroup(
            { status: 'TODO' }, 
            { status: 'DONE', priority: 'LOW', isFlagged: false }, 
            group
        )).toBe(false);

        // Nested ANY matched via Priority
        expect(evaluateRuleGroup(
            { status: 'TODO' }, 
            { status: 'DONE', priority: 'HIGH', isFlagged: false }, 
            group
        )).toBe(true);

        // Nested ANY matched via Flags
        expect(evaluateRuleGroup(
            { status: 'TODO' }, 
            { status: 'DONE', priority: 'LOW', isFlagged: true }, 
            group
        )).toBe(true);
    });

});
