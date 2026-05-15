import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ActionRunner } from './ActionRunner';

describe('ActionRunner', () => {
    const mockDb: any = {
        selectFrom: jest.fn().mockReturnThis(),
        selectAll: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        execute: jest.fn(),
    };

    const mockHandlers: any = {
        'task.update_status': jest.fn<any>().mockResolvedValue(undefined),
        'task.assign_member': jest.fn<any>().mockResolvedValue(undefined),
    };

    const runner = new ActionRunner(mockDb, mockHandlers);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should execute actions in order', async () => {
        const actions = [
            {
                type: 'task.update_status',
                config: { status: 'DONE' },
                position: 1,
            },
            {
                type: 'task.assign_member',
                config: { memberId: 'm1' },
                position: 2,
            },
        ];

        mockDb.execute.mockResolvedValue(actions);

        await runner.run('auto-1', 'task-1', 'trace-1');

        expect(mockHandlers['task.update_status']).toHaveBeenCalledWith(
            'task-1',
            { status: 'DONE' },
            { traceId: 'trace-1' },
        );
        expect(mockHandlers['task.assign_member']).toHaveBeenCalledWith(
            'task-1',
            { memberId: 'm1' },
            { traceId: 'trace-1' },
        );
    });

    it('should stop on failure', async () => {
        const actions = [
            {
                type: 'task.update_status',
                config: { status: 'DONE' },
                position: 1,
            },
            {
                type: 'task.assign_member',
                config: { memberId: 'm1' },
                position: 2,
            },
        ];

        mockDb.execute.mockResolvedValue(actions);
        mockHandlers['task.update_status'].mockRejectedValue(
            new Error('Failed!'),
        );

        await runner.run('auto-1', 'task-1', 'trace-1');

        expect(mockHandlers['task.update_status']).toHaveBeenCalled();
        expect(mockHandlers['task.assign_member']).not.toHaveBeenCalled();
    });
});
