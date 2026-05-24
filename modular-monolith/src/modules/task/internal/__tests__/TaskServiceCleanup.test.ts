import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { DomainEvent } from '../../../../infra/utils/event-bus';

const mockTrx: any = {};
const mockTransactionExecute = jest.fn<
    (callback: (trx: any) => unknown) => unknown
>((callback) => callback(mockTrx));
const mockTransaction = jest.fn(() => ({
    execute: mockTransactionExecute,
}));
const mockClaimEventsAtomic =
    jest.fn<(...args: any[]) => Promise<DomainEvent[]>>();
const mockUnassignProjectTaskMembersBatch =
    jest.fn<(...args: any[]) => Promise<{ affectedCount: number }>>();
const mockDeleteProjectTasksChunk =
    jest.fn<(...args: any[]) => Promise<{ affectedCount: number }>>();
const mockDeleteProjectTaskLinksChunk =
    jest.fn<(...args: any[]) => Promise<{ affectedCount: number }>>();
const mockDeleteProjectTaskReachabilityChunk =
    jest.fn<
        (
            ...args: any[]
        ) => Promise<{ affectedCount: number; touchedProjectIds: string[] }>
    >();
const mockOrphanTasksByTeamIdsBatch =
    jest.fn<(...args: any[]) => Promise<{ affectedCount: number }>>();
const mockUnassignMembersFromTeamTasksBatch =
    jest.fn<(...args: any[]) => Promise<{ affectedCount: number }>>();
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
    contractTaskReachability: jest.fn(),
    deleteProjectTaskLinksChunk: mockDeleteProjectTaskLinksChunk,
    deleteProjectTaskReachabilityChunk: mockDeleteProjectTaskReachabilityChunk,
    deleteProjectTasksChunk: mockDeleteProjectTasksChunk,
    deleteTask: jest.fn(),
    deleteTaskLink: jest.fn(),
    deleteTaskLinksByTaskIds: jest.fn(),
    deleteTaskReachabilityChunk: jest.fn(),
    expandTaskReachability: jest.fn(),
    getNeighbourhood: jest.fn(),
    getProjectTaskLinksPage: jest.fn(),
    getTaskContextById: jest.fn(),
    getTaskLinksPage: jest.fn(),
    getTasksByActorIdAndIds: jest.fn(),
    getTasksByIds: jest.fn(),
    getTasksPage: jest.fn(),
    insertTask: jest.fn(),
    insertTaskLink: jest.fn(),
    orphanTasksByTeamIdsBatch: mockOrphanTasksByTeamIdsBatch,
    repairTaskReachabilityForProjects: jest.fn(),
    syncTaskGraphCounters: jest.fn(),
    unassignMembersFromTeamTasksBatch: mockUnassignMembersFromTeamTasksBatch,
    unassignProjectTaskMembersBatch: mockUnassignProjectTaskMembersBatch,
    updateTask: jest.fn(),
    updateTaskLink: jest.fn(),
}));

const { TaskServiceImpl } = await import('../TaskServiceImpl.ts');
const { claimEventsAtomic } = await import(
    '../../../../infra/utils/event-bus/idempotency.ts'
);

const makeProjectUserEvent = (
    eventId: string,
    projectId: string,
    userIds: string[],
): DomainEvent<{ projectId: string; userIds: string[] }> => ({
    eventId,
    type: 'UNASSIGN_PROJECT_TASK_MEMBER',
    key: projectId,
    data: { projectId, userIds },
    timestamp: '2026-05-22T00:00:00.000Z',
});

const makeProjectIdsEvent = (
    eventId: string,
    projectIds: string[],
): DomainEvent<{ projectIds: string[] }> => ({
    eventId,
    type: 'DELETE_PROJECT_TASK',
    key: projectIds[0] ?? null,
    data: { projectIds },
    timestamp: '2026-05-22T00:00:00.000Z',
});

const makeTeamIdsEvent = (
    eventId: string,
    teamIds: string[],
): DomainEvent<{ teamIds: string[] }> => ({
    eventId,
    type: 'ORPHAN_TEAM_TASKS',
    key: teamIds[0] ?? null,
    data: { teamIds },
    timestamp: '2026-05-22T00:00:00.000Z',
});

const makeTeamUserEvent = (
    eventId: string,
    teamId: string,
    userIds: string[],
): DomainEvent<{ teamId: string; userIds: string[] }> => ({
    eventId,
    type: 'UNASSIGN_MEMBER_FROM_TEAM_TASKS',
    key: teamId,
    data: { teamId, userIds },
    timestamp: '2026-05-22T00:00:00.000Z',
});

describe('TaskServiceImpl cleanup listeners', () => {
    const service = new TaskServiceImpl();
    const projectA = '11111111-1111-4111-8111-111111111111';
    const projectB = '22222222-2222-4222-8222-222222222222';
    const teamA = '33333333-3333-4333-8333-333333333333';
    const teamB = '44444444-4444-4444-8444-444444444444';

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransactionExecute.mockImplementation((callback) =>
            callback(mockTrx),
        );
        mockUnassignProjectTaskMembersBatch.mockResolvedValue({
            affectedCount: 0,
        });
        mockDeleteProjectTasksChunk.mockResolvedValue({ affectedCount: 0 });
        mockDeleteProjectTaskLinksChunk.mockResolvedValue({
            affectedCount: 0,
        });
        mockDeleteProjectTaskReachabilityChunk.mockResolvedValue({
            affectedCount: 0,
            touchedProjectIds: [],
        });
        mockOrphanTasksByTeamIdsBatch.mockResolvedValue({ affectedCount: 0 });
        mockUnassignMembersFromTeamTasksBatch.mockResolvedValue({
            affectedCount: 0,
        });
    });

    it('handleUnassignProjectTaskMember executes bulk update to nullify member IDs', async () => {
        const events = [
            makeProjectUserEvent('event-1', projectA, ['u1', 'u2']),
            makeProjectUserEvent('event-2', projectA, ['u2', 'u3']),
            makeProjectUserEvent('event-3', projectB, ['u4']),
        ];
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleUnassignProjectTaskMember(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'task-member-unassignment-group',
        );
        expect(mockUnassignProjectTaskMembersBatch).toHaveBeenCalledWith(
            [
                { projectId: projectA, userIds: ['u1', 'u2', 'u3'] },
                { projectId: projectB, userIds: ['u4'] },
            ],
            mockTrx,
        );
    });

    it('handleDeleteProjectTask executes bulk deletion for provided project IDs', async () => {
        const events = [
            makeProjectIdsEvent('event-1', [projectA, projectB]),
            makeProjectIdsEvent('event-2', [projectA]),
        ];
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleDeleteProjectTask(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'task-decommissioning-group',
        );
        expect(mockDeleteProjectTasksChunk).toHaveBeenCalledWith(
            [projectA, projectB],
            mockTrx,
        );
    });

    it('handleOrphanTeamTasks nullifies team IDs for tasks in provided teams', async () => {
        const events = [
            makeTeamIdsEvent('event-1', [teamA, teamB]),
            makeTeamIdsEvent('event-2', [teamA]),
        ];
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleOrphanTeamTasks(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'team-task-orphaning-group',
        );
        expect(mockOrphanTasksByTeamIdsBatch).toHaveBeenCalledWith(
            [teamA, teamB],
            mockTrx,
        );
    });

    it('all cleanup methods call claimEventsAtomic and wrap operations in a transaction', async () => {
        const projectUserEvents = [
            makeProjectUserEvent('event-1', projectA, ['u1']),
        ];
        const projectEvents = [makeProjectIdsEvent('event-2', [projectA])];
        const teamEvents = [makeTeamIdsEvent('event-3', [teamA])];
        const teamUserEvents = [
            makeTeamUserEvent('event-4', teamA, ['u1', 'u2']),
        ];
        mockClaimEventsAtomic.mockImplementation(
            async (_trx, events) => events,
        );

        await service.handleUnassignProjectTaskMember(projectUserEvents);
        await service.handleDeleteProjectTask(projectEvents);
        await service.handleDeleteProjectTaskLink(projectEvents);
        await service.handleDeleteProjectReachability(projectEvents);
        await service.handleOrphanTeamTasks(teamEvents);
        await service.handleUnassignMemberFromTeamTasks(teamUserEvents);

        expect(mockTransaction).toHaveBeenCalledTimes(6);
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            1,
            mockTrx,
            projectUserEvents,
            'task-member-unassignment-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            2,
            mockTrx,
            projectEvents,
            'task-decommissioning-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            3,
            mockTrx,
            projectEvents,
            'task-link-decommissioning-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            4,
            mockTrx,
            projectEvents,
            'task-project-reachability-purge-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            5,
            mockTrx,
            teamEvents,
            'team-task-orphaning-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            6,
            mockTrx,
            teamUserEvents,
            'team-task-unassignment-group',
        );
        expect(mockDeleteProjectTaskLinksChunk).toHaveBeenCalledWith(
            [projectA],
            mockTrx,
        );
        expect(mockDeleteProjectTaskReachabilityChunk).toHaveBeenCalledWith(
            [projectA],
            mockTrx,
        );
        expect(mockUnassignMembersFromTeamTasksBatch).toHaveBeenCalledWith(
            teamA,
            ['u1', 'u2'],
            mockTrx,
        );
    });
});
