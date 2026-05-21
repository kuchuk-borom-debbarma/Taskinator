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
const mockIncrementTeamMemberCountsBulk =
    jest.fn<(...args: any[]) => Promise<void>>();
const mockUpdateTeamTaskCountsBulk =
    jest.fn<(...args: any[]) => Promise<void>>();
const mockRemoveProjectTeamMembersBatch =
    jest.fn<
        (...args: any[]) => Promise<{
            affectedProjectCount: number;
            affectedTeamCount: number;
        }>
    >();
const mockDeleteProjectTeamMemberBatch =
    jest.fn<(...args: any[]) => Promise<{ affectedCount: number }>>();
const mockDeleteProjectTeamBatch =
    jest.fn<(...args: any[]) => Promise<{ affectedCount: number }>>();
const mockPurgeTeamMembershipsByTeamIdsBatch =
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

jest.unstable_mockModule('../TeamQueries.ts', () => ({
    deleteProjectTeamBatch: mockDeleteProjectTeamBatch,
    deleteProjectTeamMemberBatch: mockDeleteProjectTeamMemberBatch,
    deleteTeamMembers: jest.fn(),
    deleteTeams: jest.fn(),
    getTeamMembers: jest.fn(),
    getTeams: jest.fn(),
    getTeamsByActorIdAndIds: jest.fn(),
    getTeamsByIds: jest.fn(),
    insertTeam: jest.fn(),
    insertTeamMembers: jest.fn(),
    incrementTeamMemberCountsBulk: mockIncrementTeamMemberCountsBulk,
    purgeTeamMembershipsByTeamIdsBatch: mockPurgeTeamMembershipsByTeamIdsBatch,
    removeProjectTeamMembersBatch: mockRemoveProjectTeamMembersBatch,
    searchTeamUsers: jest.fn(),
    updateTeam: jest.fn(),
    updateTeamTaskCountsBulk: mockUpdateTeamTaskCountsBulk,
}));

const { TeamServiceImpl } = await import('../TeamServiceImpl.ts');
const { claimEventsAtomic } = await import(
    '../../../../utils/event-bus/idempotency.ts'
);

const makeDeltaEvent = (
    eventId: string,
    teamId: string,
    delta: number,
): DomainEvent<{ teamId: string; delta: number }> => ({
    eventId,
    type: 'COUNT_SYNC',
    key: teamId,
    data: { teamId, delta },
    timestamp: '2026-05-22T00:00:00.000Z',
});

const makeRemovalEvent = (
    eventId: string,
    projectId: string,
    userIds: string[],
): DomainEvent<{ projectId: string; userIds: string[] }> => ({
    eventId,
    type: 'REMOVE_PROJECT_TEAM_MEMBER',
    key: projectId,
    data: { projectId, userIds },
    timestamp: '2026-05-22T00:00:00.000Z',
});

const makeProjectDeleteEvent = (
    eventId: string,
    projectIds: string[],
): DomainEvent<{ projectIds: string[] }> => ({
    eventId,
    type: 'DELETE_PROJECT_TEAM',
    key: projectIds[0] ?? null,
    data: { projectIds },
    timestamp: '2026-05-22T00:00:00.000Z',
});

const makeTeamDeleteEvent = (
    eventId: string,
    teamIds: string[],
): DomainEvent<{ teamIds: string[] }> => ({
    eventId,
    type: 'PURGE_TEAM_MEMBERSHIPS',
    key: teamIds[0] ?? null,
    data: { teamIds },
    timestamp: '2026-05-22T00:00:00.000Z',
});

describe('TeamServiceImpl batch listeners', () => {
    const service = new TeamServiceImpl();
    const teamA = '11111111-1111-4111-8111-111111111111';
    const teamB = '22222222-2222-4222-8222-222222222222';
    const projectA = '33333333-3333-4333-8333-333333333333';
    const projectB = '44444444-4444-4444-8444-444444444444';

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransactionExecute.mockImplementation((callback) =>
            callback(mockTrx),
        );
        mockRemoveProjectTeamMembersBatch.mockResolvedValue({
            affectedProjectCount: 0,
            affectedTeamCount: 0,
        });
        mockDeleteProjectTeamMemberBatch.mockResolvedValue({
            affectedCount: 0,
        });
        mockDeleteProjectTeamBatch.mockResolvedValue({ affectedCount: 0 });
        mockPurgeTeamMembershipsByTeamIdsBatch.mockResolvedValue({
            affectedCount: 0,
        });
    });

    it('handleSyncTeamMemberCount consolidates deltas per team', async () => {
        const events = [
            makeDeltaEvent('event-1', teamA, 2),
            makeDeltaEvent('event-2', teamA, -1),
            makeDeltaEvent('event-3', teamB, 3),
        ];
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleSyncTeamMemberCount(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'team-member-count-group',
        );
        const updates = mockIncrementTeamMemberCountsBulk.mock.calls[0]?.[1] as
            | Map<string, number>
            | undefined;
        expect(updates?.get(teamA)).toBe(1);
        expect(updates?.get(teamB)).toBe(3);
        expect(mockIncrementTeamMemberCountsBulk).toHaveBeenCalledWith(
            mockTrx,
            expect.any(Map),
        );
    });

    it('handlePurgeTeamMemberships executes bulk deletion for provided team IDs', async () => {
        const events = [
            makeTeamDeleteEvent('event-1', [teamA, teamB]),
            makeTeamDeleteEvent('event-2', [teamA]),
        ];
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handlePurgeTeamMemberships(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'team-membership-purge-group',
        );
        expect(mockPurgeTeamMembershipsByTeamIdsBatch).toHaveBeenCalledWith(
            [teamA, teamB],
            mockTrx,
        );
    });

    it('handleDeleteProjectTeam executes bulk deletion for provided project IDs', async () => {
        const events = [
            makeProjectDeleteEvent('event-1', [projectA, projectB]),
            makeProjectDeleteEvent('event-2', [projectA]),
        ];
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleDeleteProjectTeam(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'team-decommissioning-group',
        );
        expect(mockDeleteProjectTeamBatch).toHaveBeenCalledWith(
            [projectA, projectB],
            mockTrx,
        );
    });

    it('all methods call claimEventsAtomic and wrap operations in a transaction', async () => {
        const teamEvents = [makeDeltaEvent('event-1', teamA, 1)];
        const removalEvents = [
            makeRemovalEvent('event-2', projectA, ['u1', 'u2']),
            makeRemovalEvent('event-3', projectA, ['u2', 'u3']),
        ];
        const projectEvents = [makeProjectDeleteEvent('event-4', [projectA])];
        const purgeEvents = [makeTeamDeleteEvent('event-5', [teamA])];
        mockClaimEventsAtomic.mockImplementation(
            async (_trx, events) => events,
        );

        await service.handleSyncTeamMemberCount(teamEvents);
        await service.handleRemoveProjectTeamMember(removalEvents);
        await service.handleDeleteProjectTeamMember(projectEvents);
        await service.handleDeleteProjectTeam(projectEvents);
        await service.handlePurgeTeamMemberships(purgeEvents);
        await service.handleSyncTeamTaskCount(teamEvents);

        expect(mockTransaction).toHaveBeenCalledTimes(6);
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            1,
            mockTrx,
            teamEvents,
            'team-member-count-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            2,
            mockTrx,
            removalEvents,
            'team-project-member-purge-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            3,
            mockTrx,
            projectEvents,
            'team-membership-decommissioning-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            4,
            mockTrx,
            projectEvents,
            'team-decommissioning-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            5,
            mockTrx,
            purgeEvents,
            'team-membership-purge-group',
        );
        expect(claimEventsAtomic).toHaveBeenNthCalledWith(
            6,
            mockTrx,
            teamEvents,
            'team-task-count-group',
        );
        expect(mockRemoveProjectTeamMembersBatch).toHaveBeenCalledWith(
            [{ projectId: projectA, userIds: ['u1', 'u2', 'u3'] }],
            mockTrx,
        );
        expect(mockDeleteProjectTeamMemberBatch).toHaveBeenCalledWith(
            [projectA],
            mockTrx,
        );
        expect(mockUpdateTeamTaskCountsBulk).toHaveBeenCalledWith(
            expect.any(Map),
            mockTrx,
        );
    });
});
