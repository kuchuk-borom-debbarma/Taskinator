import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import type { TaskReachabilityLinkChange } from '../../TaskService.ts';

const mockTrx: any = {};
const mockTransactionExecute = jest.fn<
    (callback: (trx: any) => unknown) => unknown
>((callback) => callback(mockTrx));
const mockTransaction = jest.fn(() => ({
    execute: mockTransactionExecute,
}));
const mockClaimEventsAtomic =
    jest.fn<(...args: any[]) => Promise<DomainEvent[]>>();
const mockExpandTaskReachability = jest.fn<(...args: any[]) => Promise<void>>();
const mockContractTaskReachability =
    jest.fn<(...args: any[]) => Promise<void>>();
const mockSyncTaskGraphCounters = jest.fn<(...args: any[]) => Promise<void>>();
const mockDeleteTaskLinksByTaskIds =
    jest.fn<(...args: any[]) => Promise<void>>();
const mockDeleteTaskReachabilityChunk =
    jest.fn<
        (
            ...args: any[]
        ) => Promise<{ affectedCount: number; affectedProjectIds: string[] }>
    >();
const mockRepairTaskReachabilityForProjects =
    jest.fn<(...args: any[]) => Promise<void>>();
const mockAppendEventsToOutbox = jest.fn<(...args: any[]) => Promise<void>>();

jest.unstable_mockModule('../../../../infra/database/index.ts', () => ({
    db: {
        transaction: mockTransaction,
    },
}));

jest.unstable_mockModule(
    '../../../../infra/utils/event-bus/idempotency.ts',
    () => ({
        claimEventsAtomic: mockClaimEventsAtomic,
        createEvent: jest.fn(),
    }),
);

jest.unstable_mockModule(
    '../../../../infra/utils/event-bus/OutboxQueries.ts',
    () => ({
        appendEventsToOutbox: mockAppendEventsToOutbox,
    }),
);

jest.unstable_mockModule('../TaskQueries.ts', () => ({
    BULK_DELETE_CHUNK_SIZE: 2000,
    contractTaskReachability: mockContractTaskReachability,
    deleteProjectTaskLinksChunk: jest.fn(),
    deleteProjectTaskReachabilityChunk: jest.fn(),
    deleteProjectTasksChunk: jest.fn(),
    deleteTask: jest.fn(),
    deleteTaskLink: jest.fn(),
    deleteTaskLinksByTaskIds: mockDeleteTaskLinksByTaskIds,
    deleteTaskReachabilityChunk: mockDeleteTaskReachabilityChunk,
    expandTaskReachability: mockExpandTaskReachability,
    getNeighbourhood: jest.fn(),
    getProjectTaskLinksPage: jest.fn(),
    getTaskContextById: jest.fn(),
    getTaskLinksPage: jest.fn(),
    getTasksByActorIdAndIds: jest.fn(),
    getTasksByIds: jest.fn(),
    getTasksPage: jest.fn(),
    insertTask: jest.fn(),
    insertTaskLink: jest.fn(),
    orphanTasksByTeamIdsBatch: jest.fn(),
    repairTaskReachabilityForProjects: mockRepairTaskReachabilityForProjects,
    syncTaskGraphCounters: mockSyncTaskGraphCounters,
    unassignMembersFromTeamTasksBatch: jest.fn(),
    unassignProjectTaskMembersBatch: jest.fn(),
    updateTask: jest.fn(),
    updateTaskLink: jest.fn(),
}));

const { TaskServiceImpl } = await import('../TaskServiceImpl.ts');
const { claimEventsAtomic } = await import(
    '../../../../infra/utils/event-bus/idempotency.ts'
);

const makeReachabilityEvent = (
    eventId: string,
    projectId: string,
    links: TaskReachabilityLinkChange[],
): DomainEvent<{
    projectId: string;
    links: TaskReachabilityLinkChange[];
}> => ({
    eventId,
    type: 'SYNC_TASK_REACHABILITY',
    key: projectId,
    data: { projectId, links },
    timestamp: '2026-05-22T00:00:00.000Z',
});

const makeTaskIdsEvent = (
    eventId: string,
    taskIds: string[],
): DomainEvent<{ taskIds: string[] }> => ({
    eventId,
    type: 'DELETE_TASK_GRAPH_DATA',
    key: taskIds[0] ?? null,
    data: { taskIds },
    timestamp: '2026-05-22T00:00:00.000Z',
});

describe('TaskServiceImpl graph listeners', () => {
    const service = new TaskServiceImpl();
    const projectA = '11111111-1111-4111-8111-111111111111';
    const projectB = '22222222-2222-4222-8222-222222222222';
    const taskA = '33333333-3333-4333-8333-333333333333';
    const taskB = '44444444-4444-4444-8444-444444444444';
    const taskC = '55555555-5555-4555-8555-555555555555';

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransactionExecute.mockImplementation((callback) =>
            callback(mockTrx),
        );
        mockDeleteTaskReachabilityChunk.mockResolvedValue({
            affectedCount: 0,
            affectedProjectIds: [],
        });
    });

    it('handleTaskReachabilitySync claims events before applying graph updates', async () => {
        const events = [
            makeReachabilityEvent('event-1', projectA, [
                {
                    action: 'ADD',
                    sourceTaskId: taskA,
                    targetTaskId: taskB,
                },
                {
                    action: 'REMOVE',
                    sourceTaskId: taskB,
                    targetTaskId: taskC,
                },
            ]),
        ];
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleTaskReachabilitySync(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'task-reachability-sync-group',
        );
        expect(mockExpandTaskReachability).toHaveBeenCalledWith(
            mockTrx,
            projectA,
            taskA,
            taskB,
        );
        expect(mockContractTaskReachability).toHaveBeenCalledWith(
            mockTrx,
            projectA,
            taskB,
            taskC,
        );
        expect(mockSyncTaskGraphCounters).toHaveBeenCalledWith(
            mockTrx,
            projectA,
        );
    });

    it('handleDeleteTaskLinks executes bulk deletion for provided task IDs', async () => {
        const events = [
            makeTaskIdsEvent('event-1', [taskA, taskB]),
            makeTaskIdsEvent('event-2', [taskA, taskC]),
        ];
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleDeleteTaskLinks(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'task-link-cleanup-group',
        );
        expect(mockDeleteTaskLinksByTaskIds).toHaveBeenCalledWith(
            [taskA, taskB, taskC],
            mockTrx,
        );
    });

    it('handleDeleteTaskReachability executes chunk deletion and final repair', async () => {
        const events = [
            makeTaskIdsEvent('event-1', [taskA, taskB]),
            makeTaskIdsEvent('event-2', [taskA, taskC]),
        ];
        mockClaimEventsAtomic.mockResolvedValue(events);
        mockDeleteTaskReachabilityChunk.mockResolvedValue({
            affectedCount: 12,
            affectedProjectIds: [projectA, projectB],
        });

        await service.handleDeleteTaskReachability(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'task-bulk-reachability-group',
        );
        expect(mockDeleteTaskReachabilityChunk).toHaveBeenCalledWith(mockTrx, [
            taskA,
            taskB,
            taskC,
        ]);
        expect(mockRepairTaskReachabilityForProjects).toHaveBeenCalledWith(
            mockTrx,
            [projectA, projectB],
        );
        expect(mockAppendEventsToOutbox).not.toHaveBeenCalled();
    });

    it('all graph methods call claimEventsAtomic and wrap operations in a transaction', async () => {
        const reachabilityEvents = [
            makeReachabilityEvent('event-1', projectA, []),
        ];
        const taskEvents = [makeTaskIdsEvent('event-2', [taskA])];
        mockClaimEventsAtomic.mockImplementation(
            async (_trx, events) => events,
        );

        await service.handleTaskReachabilitySync(reachabilityEvents);
        await service.handleDeleteTaskLinks(taskEvents);
        await service.handleDeleteTaskReachability(taskEvents);

        expect(mockTransaction).toHaveBeenCalledTimes(3);
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            1,
            mockTrx,
            reachabilityEvents,
            'task-reachability-sync-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            2,
            mockTrx,
            taskEvents,
            'task-link-cleanup-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            3,
            mockTrx,
            taskEvents,
            'task-bulk-reachability-group',
        );
    });
});
