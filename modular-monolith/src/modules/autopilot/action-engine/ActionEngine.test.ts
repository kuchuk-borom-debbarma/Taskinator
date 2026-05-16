/**
 * @file ActionEngine.test.ts
 * @description Integration tests for the Action Engine (Executor + ContextualEntity + ResolverRegistry).
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ActionExecutor } from './ActionExecutor.js';
import { AsyncResolverRegistry } from './AsyncResolverRegistry.js';
import { ContextualEntity } from './ContextualEntity.js';
import type { ActionAST } from './types.js';

describe('ActionEngine Integration', () => {
    let registry: AsyncResolverRegistry;
    let executor: ActionExecutor;

    beforeEach(() => {
        registry = new AsyncResolverRegistry();
        executor = new ActionExecutor();
    });

    it('should execute a sequence of set steps on self', async () => {
        const self = new ContextualEntity(
            'project_task',
            '1',
            { title: 'Old', status: 'TODO' },
            registry,
        );
        const ast: ActionAST = [
            { target: 'self', field: 'title', operation: 'set', value: 'New' },
            {
                target: 'self',
                field: 'status',
                operation: 'set',
                value: 'DONE',
            },
        ];

        const modified = await executor.execute(ast, self);

        expect(modified.length).toBe(1);
        expect(modified[0]).toBe(self);
        expect(self.get('title')).toBe('New');
        expect(self.get('status')).toBe('DONE');
        expect(self.getChanges()).toEqual({ title: 'New', status: 'DONE' });
    });

    it('should execute steps on lazily resolved targets', async () => {
        const parent = new ContextualEntity(
            'project_task',
            '2',
            { title: 'Parent' },
            registry,
        );
        const self = new ContextualEntity(
            'project_task',
            '1',
            { fk_project_id: 'p1' },
            registry,
        );

        // Mock the resolver
        registry.register('project_task', 'parent', async () => parent);

        const ast: ActionAST = [
            {
                target: 'self',
                field: 'status',
                operation: 'set',
                value: 'IN_PROGRESS',
            },
            {
                target: 'parent',
                field: 'title',
                operation: 'set',
                value: 'Updated Parent',
            },
        ];

        const modified = await executor.execute(ast, self);

        expect(modified.length).toBe(2);
        expect(modified).toContain(self);
        expect(modified).toContain(parent);

        expect(self.get('status')).toBe('IN_PROGRESS');
        expect(parent.get('title')).toBe('Updated Parent');
        expect(parent.getChanges()).toEqual({ title: 'Updated Parent' });
    });

    it('should only resolve related entities once (caching)', async () => {
        const parent = new ContextualEntity('project_task', '2', {}, registry);
        const self = new ContextualEntity('project_task', '1', {}, registry);

        const resolverSpy = mock(async () => parent);
        registry.register('project_task', 'parent', resolverSpy);

        const ast: ActionAST = [
            {
                target: 'parent',
                field: 'status',
                operation: 'set',
                value: 'DONE',
            },
            { target: 'parent', field: 'priority', operation: 'set', value: 1 },
        ];

        await executor.execute(ast, self);

        expect(resolverSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle unset operation', async () => {
        const self = new ContextualEntity(
            'project_task',
            '1',
            { description: 'Something' },
            registry,
        );
        const ast: ActionAST = [
            { target: 'self', field: 'description', operation: 'unset' },
        ];

        const modified = await executor.execute(ast, self);

        expect(modified.length).toBe(1);
        expect(self.get('description')).toBeUndefined();
        expect(self.getChanges()).toEqual({ description: undefined });
    });
});
