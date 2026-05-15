import { describe, expect, it, jest } from '@jest/globals';
import { ContextService, type DomainContextResolver } from './ContextService';

describe('ContextService', () => {
    const mockResolver: DomainContextResolver = {
        resolve: jest.fn<any>().mockResolvedValue({
            id: 'task-123',
            status: 'DONE',
            priority: 10,
        }),
    };

    const contextService = new ContextService();
    contextService.registerResolver('task', mockResolver);

    it('should build context by flattening live state', async () => {
        const context = await contextService.buildContext('task', 'task-123');

        expect(context['task:id']).toBe('task-123');
        expect(context['task:status']).toBe('DONE');
        expect(context['task:priority']).toBe(10);
    });

    it('should merge event payload and set changed flags', async () => {
        const eventPayload = {
            field: 'status',
            oldValue: 'TODO',
            newValue: 'DONE',
            actorId: 'user-456',
        };

        const context = await contextService.buildContext(
            'task',
            'task-123',
            eventPayload,
        );

        expect(context['task:status']).toBe('DONE');
        expect(context['task:status:changed']).toBe(true);
        expect(context['task:status:old']).toBe('TODO');
        expect(context['task:actorId']).toBe('user-456');
    });

    it('should throw error if resolver is missing', async () => {
        await expect(
            contextService.buildContext('unknown', '123'),
        ).rejects.toThrow('No resolver registered for domain: unknown');
    });
});
