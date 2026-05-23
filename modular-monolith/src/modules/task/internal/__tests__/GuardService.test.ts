import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ValidationError } from '../../../../graphql/errors.ts';

const mockSelectFrom = jest.fn<any>();
const mockSelectAll = jest.fn<any>();
const mockWhere = jest.fn<any>();
const mockExecute = jest.fn<any>();

jest.unstable_mockModule('../../../../database/index.ts', () => ({
    db: {
        selectFrom: mockSelectFrom,
    },
}));

const mockCheckActiveSubtasks = jest.fn<(taskId: string) => Promise<boolean>>();
const mockCheckIncompleteBlockers =
    jest.fn<(taskId: string) => Promise<boolean>>();
const mockCheckTeamAssignment = jest.fn<(taskId: string) => Promise<boolean>>();

jest.unstable_mockModule('../GuardQueries.ts', () => ({
    checkActiveSubtasks: mockCheckActiveSubtasks,
    checkIncompleteBlockers: mockCheckIncompleteBlockers,
    checkTeamAssignment: mockCheckTeamAssignment,
}));

const { guardService } = await import('../GuardService.ts');

describe('GuardService Pre-Action Guards', () => {
    const projectId = 'project-123';
    const taskId = 'task-123';

    beforeEach(() => {
        jest.clearAllMocks();

        mockSelectFrom.mockReturnValue({
            selectAll: mockSelectAll,
        });
        mockSelectAll.mockReturnValue({
            where: mockWhere,
        });
        mockWhere.mockReturnValue({
            where: mockWhere,
            execute: mockExecute,
        });
    });

    it('PARENT_DELETE_GUARD blocks deletion if active subtasks exist', async () => {
        // Mock active behavior rule
        mockExecute.mockResolvedValue([
            {
                id: 'rule-1',
                fk_project_id: projectId,
                behavior_type: 'PARENT_DELETE_GUARD',
                is_active: true,
                action_message:
                    'Cannot delete parent task with active subtasks.',
            },
        ]);

        // Subtask check returns true (active subtasks exist)
        mockCheckActiveSubtasks.mockResolvedValue(true);

        await expect(
            guardService.evaluateGuards('delete', { projectId, taskId }),
        ).rejects.toThrow(ValidationError);

        expect(mockCheckActiveSubtasks).toHaveBeenCalledWith(taskId);
    });

    it('PARENT_DELETE_GUARD allows deletion if no active subtasks exist', async () => {
        mockExecute.mockResolvedValue([
            {
                id: 'rule-1',
                fk_project_id: projectId,
                behavior_type: 'PARENT_DELETE_GUARD',
                is_active: true,
                action_message:
                    'Cannot delete parent task with active subtasks.',
            },
        ]);

        mockCheckActiveSubtasks.mockResolvedValue(false);

        await expect(
            guardService.evaluateGuards('delete', { projectId, taskId }),
        ).resolves.not.toThrow();
    });

    it('BLOCKER_SAFETY_GUARD blocks update to IN_PROGRESS if incomplete blockers exist', async () => {
        mockExecute.mockResolvedValue([
            {
                id: 'rule-2',
                fk_project_id: projectId,
                behavior_type: 'BLOCKER_SAFETY_GUARD',
                is_active: true,
                action_message: 'Blockers are incomplete.',
            },
        ]);

        mockCheckIncompleteBlockers.mockResolvedValue(true);

        await expect(
            guardService.evaluateGuards('update', {
                projectId,
                taskId,
                status: 'IN_PROGRESS',
            }),
        ).rejects.toThrow(ValidationError);

        expect(mockCheckIncompleteBlockers).toHaveBeenCalledWith(taskId);
    });

    it('MEMBER_ASSIGNMENT_GUARD blocks assignment if team is missing', async () => {
        mockExecute.mockResolvedValue([
            {
                id: 'rule-3',
                fk_project_id: projectId,
                behavior_type: 'MEMBER_ASSIGNMENT_GUARD',
                is_active: true,
                action_message: 'Team context required for member assignment.',
            },
        ]);

        // Case A: teamId changed to null explicitly in update
        await expect(
            guardService.evaluateGuards('update', {
                projectId,
                taskId,
                memberId: 'member-121',
                teamId: null,
            }),
        ).rejects.toThrow(ValidationError);

        // Case B: teamId not in update, check DB (checkTeamAssignment returns true for null)
        mockCheckTeamAssignment.mockResolvedValue(true);
        await expect(
            guardService.evaluateGuards('update', {
                projectId,
                taskId,
                memberId: 'member-121',
            }),
        ).rejects.toThrow(ValidationError);

        expect(mockCheckTeamAssignment).toHaveBeenCalledWith(taskId);
    });
});
