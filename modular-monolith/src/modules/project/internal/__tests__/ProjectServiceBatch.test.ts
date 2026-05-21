import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { DomainEvent } from '../../../../utils/event-bus';

const mockTrx: any = {};
const mockTransactionExecute = jest.fn<
    (callback: (trx: any) => unknown) => unknown
>((callback) => callback(mockTrx));
const mockTransaction = jest.fn(() => ({
    execute: mockTransactionExecute,
}));
const mockClaimEventsAtomic =
    jest.fn<(...args: any[]) => Promise<DomainEvent[]>>();
const mockUpdateProjectMemberCountsBulk =
    jest.fn<(...args: any[]) => Promise<void>>();
const mockUpdateProjectTaskCountsBulk =
    jest.fn<(...args: any[]) => Promise<void>>();
const mockUpdateProjectTeamCountsBulk =
    jest.fn<(...args: any[]) => Promise<void>>();
const mockPurgeProjectMembersBatch =
    jest.fn<
        (
            ...args: any[]
        ) => Promise<{ affectedProjectMemberCounts: Map<string, number> }>
    >();
const mockPurgeProjectMembersByProjectIdsBatch =
    jest.fn<(...args: any[]) => Promise<{ affectedCount: number }>>();

jest.unstable_mockModule('../../../../database/index.ts', () => ({
    db: {
        transaction: mockTransaction,
    },
}));

jest.unstable_mockModule('../../../../utils/event-bus/idempotency.ts', () => ({
    claimEventsAtomic: mockClaimEventsAtomic,
    createEvent: jest.fn(),
}));

jest.unstable_mockModule('../ProjectQueries.ts', () => ({
    deleteProjectMembers: jest.fn(),
    deleteProjects: jest.fn(),
    getProjectMembers: jest.fn(),
    getProjectMembersByActorIdAndIds: jest.fn(),
    getProjectMembersByIds: jest.fn(),
    getProjects: jest.fn(),
    getProjectsByActorIdAndProjectIds: jest.fn(),
    getProjectsByIds: jest.fn(),
    insertProject: jest.fn(),
    insertProjectMembers: jest.fn(),
    purgeProjectMembersBatch: mockPurgeProjectMembersBatch,
    purgeProjectMembersByProjectIdsBatch:
        mockPurgeProjectMembersByProjectIdsBatch,
    updateProject: jest.fn(),
    updateProjectMemberCountsBulk: mockUpdateProjectMemberCountsBulk,
    updateProjectTaskCountsBulk: mockUpdateProjectTaskCountsBulk,
    updateProjectTeamCountsBulk: mockUpdateProjectTeamCountsBulk,
}));

const { ProjectServiceImpl } = await import('../ProjectServiceImpl.ts');
const { claimEventsAtomic } = await import(
    '../../../../utils/event-bus/idempotency.ts'
);

const makeDeltaEvent = (
    eventId: string,
    projectId: string,
    delta: number,
): DomainEvent<{ projectId: string; delta: number }> => ({
    eventId,
    type: 'COUNT_SYNC',
    key: projectId,
    data: { projectId, delta },
    timestamp: '2026-05-22T00:00:00.000Z',
});

const makeRemovalEvent = (
    eventId: string,
    projectId: string,
    userIds: string[],
): DomainEvent<{ projectId: string; userIds: string[] }> => ({
    eventId,
    type: 'REMOVE_PROJECT_MEMBER',
    key: projectId,
    data: { projectId, userIds },
    timestamp: '2026-05-22T00:00:00.000Z',
});

const makeDeleteEvent = (
    eventId: string,
    projectIds: string[],
): DomainEvent<{ projectIds: string[] }> => ({
    eventId,
    type: 'DELETE_PROJECT_MEMBER',
    key: projectIds[0] ?? null,
    data: { projectIds },
    timestamp: '2026-05-22T00:00:00.000Z',
});

describe('ProjectServiceImpl batch listeners', () => {
    const service = new ProjectServiceImpl();
    const projectA = '11111111-1111-4111-8111-111111111111';
    const projectB = '22222222-2222-4222-8222-222222222222';

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransactionExecute.mockImplementation((callback) =>
            callback(mockTrx),
        );
        mockPurgeProjectMembersBatch.mockResolvedValue({
            affectedProjectMemberCounts: new Map(),
        });
        mockPurgeProjectMembersByProjectIdsBatch.mockResolvedValue({
            affectedCount: 0,
        });
    });

    it('handleProjectMemberCountSync consolidates deltas per project', async () => {
        const events = [
            makeDeltaEvent('event-1', projectA, 2),
            makeDeltaEvent('event-2', projectA, -1),
            makeDeltaEvent('event-3', projectB, 3),
        ];
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleProjectMemberCountSync(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'project-member-count-group',
        );
        const updates = mockUpdateProjectMemberCountsBulk.mock.calls[0]?.[0] as
            | Map<string, number>
            | undefined;
        expect(updates?.get(projectA)).toBe(1);
        expect(updates?.get(projectB)).toBe(3);
        expect(mockUpdateProjectMemberCountsBulk).toHaveBeenCalledWith(
            expect.any(Map),
            mockTrx,
        );
    });

    it('handleRemoveProjectMember executes bulk deletion for provided user IDs', async () => {
        const events = [
            makeRemovalEvent('event-1', projectA, ['u1', 'u2']),
            makeRemovalEvent('event-2', projectA, ['u2', 'u3']),
            makeRemovalEvent('event-3', projectB, ['u4']),
        ];
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleRemoveProjectMember(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'project-member-removal-group',
        );
        expect(mockPurgeProjectMembersBatch).toHaveBeenCalledWith(
            [
                { projectId: projectA, userIds: ['u1', 'u2', 'u3'] },
                { projectId: projectB, userIds: ['u4'] },
            ],
            mockTrx,
        );
    });

    it('handleDeleteProjectMember executes bulk deletion for provided project IDs', async () => {
        const events = [
            makeDeleteEvent('event-1', [projectA, projectB]),
            makeDeleteEvent('event-2', [projectA]),
        ];
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleDeleteProjectMember(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'project-decommissioning-group',
        );
        expect(mockPurgeProjectMembersByProjectIdsBatch).toHaveBeenCalledWith(
            [projectA, projectB],
            mockTrx,
        );
    });

    it('all count methods call claimEventsAtomic and wrap operations in a transaction', async () => {
        const events = [makeDeltaEvent('event-1', projectA, 1)];
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleProjectMemberCountSync(events);
        await service.handleSyncProjectTaskCount(events);
        await service.handleSyncProjectTeamCount(events);

        expect(mockTransaction).toHaveBeenCalledTimes(3);
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            1,
            mockTrx,
            events,
            'project-member-count-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            2,
            mockTrx,
            events,
            'project-task-count-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            3,
            mockTrx,
            events,
            'project-team-count-group',
        );
        expect(mockUpdateProjectTaskCountsBulk).toHaveBeenCalledWith(
            expect.any(Map),
            mockTrx,
        );
        expect(mockUpdateProjectTeamCountsBulk).toHaveBeenCalledWith(
            expect.any(Map),
            mockTrx,
        );
    });
});
