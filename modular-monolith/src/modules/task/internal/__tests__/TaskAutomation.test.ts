import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ValidationError } from '../../../../infra/graphql/errors.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import type { Task } from '../../TaskService.ts';

const projectId = '11111111-1111-4111-8111-111111111111';
const actorId = 'user-1';
const blockerTaskId = '22222222-2222-4222-8222-222222222222';
const blockedTaskId = '33333333-3333-4333-8333-333333333333';

const blockedTask: Task = {
    id: blockedTaskId,
    projectId,
    teamId: null,
    memberId: null,
    title: 'Blocked task',
    description: '',
    status: 'TODO',
    version: 1,
    createdBy: actorId,
    updatedBy: actorId,
    priority: 0,
    createdAt: new Date('2026-05-24T00:00:00.000Z'),
    updatedAt: new Date('2026-05-24T00:00:00.000Z'),
    directIncomingCount: 1,
    directOutgoingCount: 0,
    totalIncomingCount: 1,
    totalOutgoingCount: 0,
    incomingLabelCounts: {},
    outgoingLabelCounts: {},
};

const mockGetTasksByActorIdAndIds =
    jest.fn<(...args: any[]) => Promise<Task[]>>();
const mockUpdateTaskQuery = jest.fn<(...args: any[]) => Promise<Task>>();
const mockTaskServiceUpdateTask = jest.fn<(...args: any[]) => Promise<Task>>();
const mockEventBusSubscribe = jest.fn<(...args: any[]) => Promise<void>>();

const makeQuery = (rows: any[]) => {
    const query: any = {
        innerJoin: jest.fn(() => query),
        limit: jest.fn(() => query),
        orderBy: jest.fn(() => query),
        select: jest.fn(() => query),
        selectAll: jest.fn(() => query),
        where: jest.fn(() => query),
        execute: jest.fn(async () => rows),
    };
    return query;
};

const mockDb = {
    selectFrom: jest.fn((_table: string) => makeQuery([])),
};

jest.unstable_mockModule('../../../../infra/database/index.ts', () => ({
    db: mockDb,
}));

jest.unstable_mockModule('../../../../infra/utils/EventBus.ts', () => ({
    default: {
        subscribe: mockEventBusSubscribe,
    },
}));

jest.unstable_mockModule('../../index.ts', () => ({
    taskService: {
        updateTask: mockTaskServiceUpdateTask,
    },
}));

jest.unstable_mockModule('../TaskQueries.ts', () => ({
    BULK_DELETE_CHUNK_SIZE: 2000,
    contractTaskReachability: jest.fn(),
    deleteProjectTaskLinksChunk: jest.fn(),
    deleteProjectTaskReachabilityChunk: jest.fn(),
    deleteProjectTasksChunk: jest.fn(),
    deleteTask: jest.fn(),
    deleteTaskLink: jest.fn(),
    deleteTaskLinksByTaskIds: jest.fn(),
    deleteTaskReachabilityChunk: jest.fn(),
    expandTaskReachability: jest.fn(),
    getNeighbourhood: jest.fn(),
    getProjectTaskLinksPage: jest.fn(),
    getTaskContextById: jest.fn(),
    getTaskLinksPage: jest.fn(),
    getTasksByActorIdAndIds: mockGetTasksByActorIdAndIds,
    getTasksByIds: jest.fn(),
    getTasksPage: jest.fn(),
    insertTask: jest.fn(),
    insertTaskLink: jest.fn(),
    orphanTasksByTeamIdsBatch: jest.fn(),
    repairTaskReachabilityForProjects: jest.fn(),
    syncTaskGraphCounters: jest.fn(),
    unassignMembersFromTeamTasksBatch: jest.fn(),
    unassignProjectTaskMembersBatch: jest.fn(),
    updateTask: mockUpdateTaskQuery,
    updateTaskLink: jest.fn(),
}));

const { TaskServiceImpl } = await import('../TaskServiceImpl.ts');
const { TaskAutomationListener } = await import(
    '../listeners/TaskAutomationListener.ts'
);

describe('Task TCA automation engine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetTasksByActorIdAndIds.mockResolvedValue([blockedTask]);
        mockUpdateTaskQuery.mockResolvedValue({
            ...blockedTask,
            status: 'IN_PROGRESS',
            version: 2,
        });
        mockTaskServiceUpdateTask.mockResolvedValue({
            ...blockedTask,
            status: 'READY',
            version: 2,
        });
    });

    it('rejects blocked sync status transitions before the task update runs', async () => {
        mockDb.selectFrom
            .mockReturnValueOnce(
                makeQuery([
                    {
                        id: 'rule-1',
                        fk_project_id: projectId,
                        is_active: true,
                        is_sync: true,
                        trigger_type: 'TASK_STATUS_CHANGED',
                        trigger_value: 'IN_PROGRESS',
                        condition_type: 'IS_BLOCKED',
                        condition_value: null,
                        action_type: 'REJECT_TRANSITION',
                        action_value: 'Finish blockers first.',
                    },
                ]),
            )
            .mockReturnValueOnce(makeQuery([{ id: blockerTaskId }]));

        const service = new TaskServiceImpl();

        await expect(
            service.updateTask({
                actorId,
                projectId,
                taskId: blockedTaskId,
                version: 1,
                status: 'IN_PROGRESS',
            }),
        ).rejects.toThrow(ValidationError);

        expect(mockUpdateTaskQuery).not.toHaveBeenCalled();
    });

    it('unlocks downstream tasks through standard updateTask after prerequisite completion', async () => {
        mockDb.selectFrom
            .mockReturnValueOnce(
                makeQuery([
                    {
                        id: 'rule-2',
                        fk_project_id: projectId,
                        is_active: true,
                        is_sync: false,
                        trigger_type: 'PREREQUISITE_COMPLETED',
                        trigger_value: null,
                        condition_type: 'ALL_PREREQUISITES_DONE',
                        condition_value: null,
                        action_type: 'SET_STATUS',
                        action_value: 'READY',
                    },
                ]),
            )
            .mockReturnValueOnce(makeQuery([blockedTask]))
            .mockReturnValueOnce(makeQuery([]));

        const event: DomainEvent<{
            taskId: string;
            projectId: string;
            old: { status: string };
            new: { status: string };
            actorId: string;
        }> = {
            eventId: 'event-1',
            type: 'task.updated',
            key: projectId,
            data: {
                taskId: blockerTaskId,
                projectId,
                old: { status: 'IN_PROGRESS' },
                new: { status: 'DONE' },
                actorId,
            },
            timestamp: '2026-05-24T00:00:00.000Z',
        };

        const listener = new TaskAutomationListener();
        await (listener as any).handleTaskUpdated([event]);

        expect(mockTaskServiceUpdateTask).toHaveBeenCalledWith({
            actorId,
            projectId,
            taskId: blockedTaskId,
            version: 1,
            status: 'READY',
        });
    });
});
