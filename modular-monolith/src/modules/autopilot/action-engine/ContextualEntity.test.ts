import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextualEntity } from './ContextualEntity';

describe('ContextualEntity', () => {
    const mockRegistry = {
        resolve: vi.fn(),
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return initial data via .get()', () => {
        const entity = new ContextualEntity(
            'project_task',
            '123',
            { status: 'open' },
            mockRegistry,
        );
        expect(entity.get('status')).toBe('open');
    });

    it('should update data and track dirty fields via .set()', () => {
        const entity = new ContextualEntity(
            'project_task',
            '123',
            { status: 'open' },
            mockRegistry,
        );
        entity.set('status', 'completed');

        expect(entity.get('status')).toBe('completed');
        expect(entity.getChanges()).toEqual({ status: 'completed' });
    });

    it('should perform runtime validation in .set()', () => {
        const entity = new ContextualEntity(
            'project_task',
            '123',
            { status: 'open', priority: 1 },
            mockRegistry,
        );

        // Status must be string
        expect(() => entity.set('status', 123)).toThrow(
            /status must be string/,
        );

        // Priority must be number
        expect(() => entity.set('priority', 'high')).toThrow(
            /priority must be number/,
        );
    });

    it('should return empty changes if nothing modified', () => {
        const entity = new ContextualEntity(
            'project_task',
            '123',
            { status: 'open' },
            mockRegistry,
        );
        expect(entity.getChanges()).toEqual({});
    });

    it('should resolve related entities via registry', async () => {
        const parentEntity = new ContextualEntity(
            'project_task',
            '456',
            { name: 'Parent Task' },
            mockRegistry,
        );
        mockRegistry.resolve.mockResolvedValue(parentEntity);

        const entity = new ContextualEntity(
            'project_task',
            '123',
            {},
            mockRegistry,
        );
        const resolved = await entity.resolve('parent');

        expect(mockRegistry.resolve).toHaveBeenCalledWith(entity, 'parent');
        expect(resolved).toBe(parentEntity);
    });

    it('should cache resolved entities', async () => {
        const parentEntity = new ContextualEntity(
            'project_task',
            '456',
            { name: 'Parent Task' },
            mockRegistry,
        );
        mockRegistry.resolve.mockResolvedValue(parentEntity);

        const entity = new ContextualEntity(
            'project_task',
            '123',
            {},
            mockRegistry,
        );

        await entity.resolve('parent');
        await entity.resolve('parent');

        expect(mockRegistry.resolve).toHaveBeenCalledTimes(1);
    });
});
