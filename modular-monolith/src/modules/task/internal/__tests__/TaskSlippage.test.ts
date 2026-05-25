import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    NotFoundError,
    ValidationError,
} from '../../../../infra/graphql/errors.ts';

const mockSelectFrom = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule('../../../../infra/database/index.ts', () => ({
    db: {
        selectFrom: mockSelectFrom,
    },
}));

const { TaskServiceImpl } = await import('../TaskServiceImpl.ts');

const makeQuery = (rows: any[]) => {
    const query: any = {
        select: jest.fn(() => query),
        where: jest.fn(() => query),
        innerJoin: jest.fn(() => query),
        distinct: jest.fn(() => query),
        execute: jest.fn(async () => rows),
        executeTakeFirst: jest.fn(async () => rows[0]),
    };
    return query;
};

describe('Slippage Blast Radius Simulator', () => {
    const service = new TaskServiceImpl();
    const projectId = '11111111-1111-4111-8111-111111111111';
    const taskId = '33333333-3333-4333-8333-333333333333';
    const userId = 'user-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('rejects simulation if actor has no project membership and is not creator', async () => {
        // Mock authorization queries: member=undefined, creator=undefined
        mockSelectFrom.mockImplementation((table: string) => {
            if (table === 'project_member' || table === 'project') {
                return makeQuery([]);
            }
            return makeQuery([]);
        });

        await expect(
            service.simulateSlippage(userId, projectId, taskId, 5),
        ).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError if target task does not exist', async () => {
        // Mock authorization: authorized, but task=undefined
        const authQueryCount = 0;
        mockSelectFrom.mockImplementation((table: string) => {
            if (table === 'project_member') {
                return makeQuery([{ id: 'member-1' }]);
            }
            if (table === 'project') {
                return makeQuery([{ fk_user_id: 'user-2' }]);
            }
            if (table === 'project_task') {
                return makeQuery([]);
            }
            return makeQuery([]);
        });

        await expect(
            service.simulateSlippage(userId, projectId, taskId, 5),
        ).rejects.toThrow(NotFoundError);
    });

    it('successfully calculates cascading slippage and risk levels', async () => {
        const descTasks = [
            {
                id: 'desc-1',
                title: 'Task B',
                dueDate: new Date('2026-06-10T00:00:00.000Z'),
            }, // slack = 5 days
            {
                id: 'desc-2',
                title: 'Task C',
                dueDate: new Date('2026-06-08T00:00:00.000Z'),
            }, // slack = 3 days
            { id: 'desc-3', title: 'Task D', dueDate: null }, // infinite buffer
        ];

        mockSelectFrom.mockImplementation((table: string) => {
            if (table === 'project_member') {
                return makeQuery([{ id: 'member-1' }]);
            }
            if (table === 'project') {
                return makeQuery([{ fk_user_id: 'user-2' }]);
            }
            if (table === 'project_task') {
                return makeQuery([
                    {
                        id: taskId,
                        title: 'Task A',
                        dueDate: new Date('2026-06-05T00:00:00.000Z'),
                    },
                ]);
            }
            if (table === 'task_reachability') {
                // Return descendants
                return makeQuery(descTasks);
            }
            return makeQuery([]);
        });

        // 1. Simulate slip of 3 days
        const result3Days = await service.simulateSlippage(
            userId,
            projectId,
            taskId,
            3,
        );

        expect(result3Days.length).toBe(4);

        // Slipped task itself
        const self3 = result3Days.find((r) => r.taskId === taskId)!;
        expect(self3.slipDays).toBe(3);
        expect(self3.riskLevel).toBe('HIGH');
        expect(self3.simulatedDueDate!.toISOString()).toBe(
            '2026-06-08T00:00:00.000Z',
        );

        // Task B (slack 5 days, delay 3 days, consumes 60% of buffer) -> LOW risk
        const b3 = result3Days.find((r) => r.taskId === 'desc-1')!;
        expect(b3.slipDays).toBe(0);
        expect(b3.riskLevel).toBe('LOW');
        expect(b3.bufferRemainingDays).toBe(2);

        // Task C (slack 3 days, delay 3 days, consumes 100% of buffer) -> MEDIUM risk
        const c3 = result3Days.find((r) => r.taskId === 'desc-2')!;
        expect(c3.slipDays).toBe(0);
        expect(c3.riskLevel).toBe('MEDIUM');
        expect(c3.bufferRemainingDays).toBe(0);

        // Task D (no original due date) -> LOW risk
        const d3 = result3Days.find((r) => r.taskId === 'desc-3')!;
        expect(d3.slipDays).toBe(0);
        expect(d3.riskLevel).toBe('LOW');
        expect(d3.simulatedDueDate).toBeNull();

        // 2. Simulate slip of 4 days
        const result4Days = await service.simulateSlippage(
            userId,
            projectId,
            taskId,
            4,
        );

        // Task B (slack 5 days, delay 4 days, consumes 80% of buffer) -> MEDIUM risk
        const b4 = result4Days.find((r) => r.taskId === 'desc-1')!;
        expect(b4.slipDays).toBe(0);
        expect(b4.riskLevel).toBe('MEDIUM');
        expect(b4.bufferRemainingDays).toBe(1);

        // Task C (slack 3 days, delay 4 days, delay > 0) -> HIGH risk (pushed by 1 day)
        const c4 = result4Days.find((r) => r.taskId === 'desc-2')!;
        expect(c4.slipDays).toBe(1);
        expect(c4.riskLevel).toBe('HIGH');
        expect(c4.simulatedDueDate!.toISOString()).toBe(
            '2026-06-09T00:00:00.000Z',
        );
        expect(c4.bufferRemainingDays).toBe(0);
    });
});
