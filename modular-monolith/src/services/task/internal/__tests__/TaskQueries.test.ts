import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database
jest.unstable_mockModule('../../../../database/index.ts', () => ({
    db: {},
}));

// Mock kysely to provide sql
jest.unstable_mockModule('kysely', () => {
    const mockSql: any = jest.fn(() => ({
        execute: jest.fn(),
    }));
    return {
        sql: mockSql,
    };
});

// Dynamic imports
const { sql } = (await import('kysely')) as any;
const TaskQueries = (await import('../TaskQueries.ts')) as any;

describe('TaskQueries', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('insertTask', () => {
        it('should insert a task and return it', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                title: 'Task 1',
                description: 'Desc 1',
                initialStatus: 'TODO',
            };

            const mockTask = {
                id: 't1',
                projectId: 'project-1',
                teamId: null,
                memberId: null,
                parentTaskId: null,
                title: 'Task 1',
                description: 'Desc 1',
                status: 'TODO',
                materializedPath: '',
                createdBy: 'user-1',
                updatedBy: 'user-1',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockExecute = (jest.fn() as any).mockResolvedValue({
                rows: [mockTask],
            });
            (sql as any).mockReturnValue({ execute: mockExecute });

            const result = await TaskQueries.insertTask(data);

            expect(sql).toHaveBeenCalled();
            expect(result).toEqual(mockTask);
        });

        it('should throw error if unauthorized or invalid params', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                title: 'Task 1',
                description: 'Desc 1',
                initialStatus: 'TODO',
            };

            const mockExecute = (jest.fn() as any).mockResolvedValue({
                rows: [],
            });
            (sql as any).mockReturnValue({ execute: mockExecute });

            await expect(TaskQueries.insertTask(data)).rejects.toThrow(
                'Unauthorized or invalid parameters',
            );
        });
    });

    describe('deleteTasks', () => {
        it('should delete tasks and return their IDs', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                taskIds: ['t1', 't2'],
            };

            const mockRows = [{ id: 't1' }, { id: 't2' }];

            const mockExecute = (jest.fn() as any).mockResolvedValue({
                rows: mockRows,
            });
            (sql as any).mockReturnValue({ execute: mockExecute });

            const result = await TaskQueries.deleteTasks(data);

            expect(result).toEqual(['t1', 't2']);
        });

        it('should throw error if not all tasks found', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                taskIds: ['t1', 't2'],
            };

            const mockRows = [{ id: 't1' }];

            const mockExecute = (jest.fn() as any).mockResolvedValue({
                rows: mockRows,
            });
            (sql as any).mockReturnValue({ execute: mockExecute });

            await expect(TaskQueries.deleteTasks(data)).rejects.toThrow(
                'Unauthorized or some tasks not found',
            );
        });
    });

    describe('updateTask', () => {
        it('should update a task and return its ID', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                taskId: 't1',
                status: 'DONE',
            };

            const mockRows = [{ id: 't1' }];

            const mockExecute = (jest.fn() as any).mockResolvedValue({
                rows: mockRows,
            });
            (sql as any).mockReturnValue({ execute: mockExecute });

            const result = await TaskQueries.updateTask(data);

            expect(result).toBe('t1');
        });

        it('should return null if update fails or unauthorized', async () => {
            const data = {
                userId: 'user-1',
                projectId: 'project-1',
                taskId: 't1',
                status: 'DONE',
            };

            const mockExecute = (jest.fn() as any).mockResolvedValue({
                rows: [],
            });
            (sql as any).mockReturnValue({ execute: mockExecute });

            const result = await TaskQueries.updateTask(data);

            expect(result).toBeNull();
        });
    });
});
