import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { OutboxEntry } from '../OutboxQueries.ts';
import type { DomainEvent } from '../types.ts';

const mockTrx = {};
const mockTransactionExecute = jest.fn<
    (callback: (trx: any) => unknown) => unknown
>((callback) => callback(mockTrx));
const mockTransaction = jest.fn(() => ({
    execute: mockTransactionExecute,
}));
const mockClaimEventsAtomic =
    jest.fn<(...args: any[]) => Promise<DomainEvent[]>>();
const mockAppendEventsToOutbox = jest.fn<(...args: any[]) => Promise<void>>();

jest.unstable_mockModule('../../../database/index.ts', () => ({
    db: {
        transaction: mockTransaction,
    },
}));

jest.unstable_mockModule('../idempotency.ts', () => ({
    claimEventsAtomic: mockClaimEventsAtomic,
}));

jest.unstable_mockModule('../OutboxQueries.ts', () => ({
    appendEventsToOutbox: mockAppendEventsToOutbox,
}));

const { AggregatorService } = await import('../AggregatorService.ts');
const { db } = await import('../../../database/index.ts');
const { claimEventsAtomic } = await import('../idempotency.ts');
const { appendEventsToOutbox } = await import('../OutboxQueries.ts');

describe('AggregatorService', () => {
    let aggregatorService: InstanceType<typeof AggregatorService>;
    const groupId = 'test-group';
    const events: DomainEvent[] = [
        { eventId: '1', type: 'test', key: 'k1', data: {}, timestamp: 'now' },
    ];

    beforeEach(() => {
        aggregatorService = new AggregatorService();
        jest.clearAllMocks();
        mockTransactionExecute.mockImplementation((callback) =>
            callback(mockTrx),
        );
    });

    it('should start a transaction and call claimEventsAtomic', async () => {
        mockClaimEventsAtomic.mockResolvedValue([]);

        await aggregatorService.processAggregatorBatch(
            groupId,
            events,
            () => [],
        );

        expect(db.transaction).toHaveBeenCalled();
        expect(claimEventsAtomic).toHaveBeenCalledWith(
            mockTrx,
            events,
            groupId,
        );
    });

    it('should return early if claimEventsAtomic returns no unprocessed events', async () => {
        mockClaimEventsAtomic.mockResolvedValue([]);
        const folder = jest.fn<() => OutboxEntry[]>();

        await aggregatorService.processAggregatorBatch(
            groupId,
            events,
            folder as any,
        );

        expect(folder).not.toHaveBeenCalled();
        expect(appendEventsToOutbox).not.toHaveBeenCalled();
    });

    it('should call folder callback with unprocessed events and append results to outbox', async () => {
        const unprocessed = [events[0]!];
        mockClaimEventsAtomic.mockResolvedValue(unprocessed);
        const outboxEntries: OutboxEntry[] = [{ stream: 't1', payload: {} }];
        const folder = jest.fn<(events: DomainEvent[]) => OutboxEntry[]>(
            () => outboxEntries,
        );

        await aggregatorService.processAggregatorBatch(groupId, events, folder);

        expect(folder).toHaveBeenCalledWith(unprocessed);
        expect(appendEventsToOutbox).toHaveBeenCalledWith(
            mockTrx,
            outboxEntries,
        );
    });

    it('should not call appendEventsToOutbox if folder returns empty array', async () => {
        const unprocessed = [events[0]!];
        mockClaimEventsAtomic.mockResolvedValue(unprocessed);
        const folder = jest.fn<(events: DomainEvent[]) => OutboxEntry[]>(
            () => [],
        );

        await aggregatorService.processAggregatorBatch(groupId, events, folder);

        expect(folder).toHaveBeenCalledWith(unprocessed);
        expect(appendEventsToOutbox).not.toHaveBeenCalled();
    });

    it('should rollback transaction if folder fails', async () => {
        mockClaimEventsAtomic.mockResolvedValue([events[0]!]);
        const folder = jest.fn<(events: DomainEvent[]) => OutboxEntry[]>(() => {
            throw new Error('Folder failed');
        });

        await expect(
            aggregatorService.processAggregatorBatch(groupId, events, folder),
        ).rejects.toThrow('Folder failed');
    });

    it('should rollback transaction if outbox append fails', async () => {
        mockClaimEventsAtomic.mockResolvedValue([events[0]!]);
        const folder = jest.fn<(events: DomainEvent[]) => OutboxEntry[]>(() => [
            { stream: 't1', payload: {} },
        ]);
        mockAppendEventsToOutbox.mockRejectedValue(new Error('Outbox failed'));

        await expect(
            aggregatorService.processAggregatorBatch(groupId, events, folder),
        ).rejects.toThrow('Outbox failed');
    });
});
