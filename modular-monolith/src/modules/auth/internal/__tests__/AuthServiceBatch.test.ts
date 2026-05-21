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
const mockUpdateUserProjectCountsBulk =
    jest.fn<(...args: any[]) => Promise<void>>();

jest.unstable_mockModule('../../../../database/index.ts', () => ({
    db: {
        transaction: mockTransaction,
    },
}));

jest.unstable_mockModule('../../../../utils/event-bus/idempotency.ts', () => ({
    claimEventsAtomic: mockClaimEventsAtomic,
}));

jest.unstable_mockModule('../AuthQueries.ts', () => ({
    updateUserProjectCountsBulk: mockUpdateUserProjectCountsBulk,
}));

const { AuthServiceImpl } = await import('../AuthServiceImpl.ts');
const { claimEventsAtomic } = await import(
    '../../../../utils/event-bus/idempotency.ts'
);
const { updateUserProjectCountsBulk } = await import('../AuthQueries.ts');

const makeEvent = (
    eventId: string,
    userId: string,
    delta: number,
): DomainEvent<{ userId: string; delta: number }> => ({
    eventId,
    type: 'PROJECT_AGGREGATED_CHANGE_USER_PROJECT_COUNT',
    key: userId,
    data: { userId, delta },
    timestamp: '2026-05-22T00:00:00.000Z',
});

describe('AuthServiceImpl.handleUserProjectCountSync', () => {
    const service = new AuthServiceImpl();
    const userA = '11111111-1111-4111-8111-111111111111';
    const userB = '22222222-2222-4222-8222-222222222222';
    const events = [
        makeEvent('event-1', userA, 1),
        makeEvent('event-2', userA, 2),
        makeEvent('event-3', userB, -1),
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransactionExecute.mockImplementation((callback) =>
            callback(mockTrx),
        );
    });

    it('calls claimEventsAtomic with the auth project aggregator group', async () => {
        mockClaimEventsAtomic.mockResolvedValue([]);

        await service.handleUserProjectCountSync(events);

        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            'auth-project-aggregator-group',
        );
    });

    it('consolidates multiple delta events for the same user', async () => {
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleUserProjectCountSync(events);

        const updates = mockUpdateUserProjectCountsBulk.mock.calls[0]?.[0] as
            | Map<string, number>
            | undefined;
        expect(updates).toBeDefined();
        expect(updates?.get(userA)).toBe(3);
        expect(updates?.get(userB)).toBe(-1);
    });

    it('executes bulk update with consolidated deltas inside the transaction', async () => {
        mockClaimEventsAtomic.mockResolvedValue(events);

        await service.handleUserProjectCountSync(events);

        expect(updateUserProjectCountsBulk).toHaveBeenCalledWith(
            expect.any(Map),
            mockTrx,
        );
    });

    it('skips updates if no new events are claimed', async () => {
        mockClaimEventsAtomic.mockResolvedValue([]);

        await service.handleUserProjectCountSync(events);

        expect(updateUserProjectCountsBulk).not.toHaveBeenCalled();
    });
});
