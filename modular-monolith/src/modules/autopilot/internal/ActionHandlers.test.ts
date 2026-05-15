import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { TaskService } from '../../task/TaskService';
import { createActionHandlers } from './ActionHandlers';

describe('ActionHandlers', () => {
    let mockTaskService: jest.Mocked<TaskService>;
    let handlers: ReturnType<typeof createActionHandlers>;
    const traceId = 'test-trace-id';

    beforeEach(() => {
        mockTaskService = {
            getTasksByIds: jest.fn(),
            updateTask: jest.fn(),
        } as any;
        handlers = createActionHandlers(mockTaskService);
    });

    it('should update status', async () => {
        const taskId = 'task-1';
        const config = { status: 'DONE' };
        mockTaskService.getTasksByIds.mockResolvedValueOnce([
            { id: taskId, projectId: 'proj-1', version: 1 } as any,
        ]);

        await handlers['task.update_status'](taskId, config, { traceId });

        expect(mockTaskService.getTasksByIds).toHaveBeenCalledWith([taskId]);
        expect(mockTaskService.updateTask).toHaveBeenCalledWith({
            actorId: 'system:autopilot',
            projectId: 'proj-1',
            taskId,
            version: 1,
            status: 'DONE',
        });
    });

    it('should assign team', async () => {
        const taskId = 'task-1';
        const config = { teamId: 'team-1' };
        mockTaskService.getTasksByIds.mockResolvedValueOnce([
            { id: taskId, projectId: 'proj-1', version: 1 } as any,
        ]);

        await handlers['task.assign_team'](taskId, config, { traceId });

        expect(mockTaskService.updateTask).toHaveBeenCalledWith(
            expect.objectContaining({
                teamId: 'team-1',
            }),
        );
    });

    it('should assign member', async () => {
        const taskId = 'task-1';
        const config = { memberId: 'user-1' };
        mockTaskService.getTasksByIds.mockResolvedValueOnce([
            { id: taskId, projectId: 'proj-1', version: 1 } as any,
        ]);

        await handlers['task.assign_member'](taskId, config, { traceId });

        expect(mockTaskService.updateTask).toHaveBeenCalledWith(
            expect.objectContaining({
                memberId: 'user-1',
            }),
        );
    });

    it('should unassign team', async () => {
        const taskId = 'task-1';
        mockTaskService.getTasksByIds.mockResolvedValueOnce([
            { id: taskId, projectId: 'proj-1', version: 1 } as any,
        ]);

        await handlers['task.unassign_team'](taskId, {}, { traceId });

        expect(mockTaskService.updateTask).toHaveBeenCalledWith(
            expect.objectContaining({
                teamId: null,
            }),
        );
    });

    it('should unassign member', async () => {
        const taskId = 'task-1';
        mockTaskService.getTasksByIds.mockResolvedValueOnce([
            { id: taskId, projectId: 'proj-1', version: 1 } as any,
        ]);

        await handlers['task.unassign_member'](taskId, {}, { traceId });

        expect(mockTaskService.updateTask).toHaveBeenCalledWith(
            expect.objectContaining({
                memberId: null,
            }),
        );
    });

    it('should throw error if task not found', async () => {
        const taskId = 'non-existent';
        mockTaskService.getTasksByIds.mockResolvedValueOnce([]);

        await expect(
            handlers['task.update_status'](
                taskId,
                { status: 'DONE' },
                { traceId },
            ),
        ).rejects.toThrow(/not found/);
    });
});
