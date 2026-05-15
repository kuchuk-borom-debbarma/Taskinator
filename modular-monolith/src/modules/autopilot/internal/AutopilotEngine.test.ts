import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AutopilotEngine } from './AutopilotEngine';

describe('AutopilotEngine', () => {
    const mockDb: any = {
        selectFrom: jest.fn().mockReturnThis(),
        selectAll: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn(),
    };

    const mockContextService: any = {
        buildContext: jest
            .fn<any>()
            .mockResolvedValue({ 'task:status': 'DONE' }),
    };

    const mockConditionEvaluator: any = {
        evaluate: jest.fn<any>(),
    };

    const engine = new AutopilotEngine(
        mockDb,
        mockContextService,
        mockConditionEvaluator,
    );

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should process event and evaluate matching autopilots', async () => {
        const mockAutopilot = {
            id: 'auto-1',
            conditions: {
                type: 'predicate',
                key: 'task:status',
                operator: 'eq',
                value: 'DONE',
            },
            triggers: ['task.updated'],
        };

        mockDb.execute.mockResolvedValue([mockAutopilot]);
        mockConditionEvaluator.evaluate.mockReturnValue(true);

        await engine.processEvent({
            type: 'task.updated',
            payload: { taskId: 't1', status: 'DONE' },
            traceId: 'tr-1',
        });

        expect(mockDb.selectFrom).toHaveBeenCalledWith('autopilot');
        expect(mockContextService.buildContext).toHaveBeenCalledWith(
            'task',
            't1',
            { taskId: 't1', status: 'DONE' },
        );
        expect(mockConditionEvaluator.evaluate).toHaveBeenCalled();
    });

    it('should skip if no autopilots match', async () => {
        mockDb.execute.mockResolvedValue([]);

        await engine.processEvent({
            type: 'task.updated',
            payload: { taskId: 't1' },
            traceId: 'tr-1',
        });

        expect(mockContextService.buildContext).not.toHaveBeenCalled();
    });
});
