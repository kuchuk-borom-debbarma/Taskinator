/**
 * TIER 2 EDA: Idempotency Engine Integration Tests
 *
 * Verifies the `withIdempotency` function using a real DB-backed
 * `processed_event` table to guarantee exactly-once processing.
 *
 * - First delivery: handler is called, processed_event row inserted
 * - Retry (same eventId, same groupId): handler is NOT called again
 * - Same eventId, different groupId: each group processes independently
 */
import {
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from '@jest/globals';
import { db } from '../database/index.ts';
import { cleanupDb, destroyDb } from './helpers/db.ts';
import {
    withIdempotency,
    createEvent,
} from '../utils/event-bus/idempotency.ts';

describe('withIdempotency — Real DB Integration', () => {
    beforeEach(async () => {
        await cleanupDb();
    });

    afterAll(async () => {
        await cleanupDb();
        await destroyDb();
    });

    it('calls the handler exactly once for a new event', async () => {
        const handler = jest.fn(async () => {}) as any;
        const event = createEvent('PROJECT_CREATED', 'key-1', {
            projectId: 'p1',
        });

        await withIdempotency([event], 'group-A', handler);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith([event]);
    });

    it('inserts a row into processed_event on first delivery', async () => {
        const event = createEvent('PROJECT_CREATED', 'key-2', {});
        await withIdempotency(
            [event],
            'group-A',
            jest.fn(async () => {}) as any,
        );

        const rows = await db
            .selectFrom('processed_event')
            .selectAll()
            .where('event_id', '=', event.eventId as any)
            .where('consumer_group', '=', 'group-A')
            .execute();

        expect(rows).toHaveLength(1);
    });

    it('does NOT call the handler on retry (same eventId, same groupId)', async () => {
        const handler = jest.fn(async () => {}) as any;
        const event = createEvent('PROJECT_CREATED', 'key-3', {});

        // First delivery
        await withIdempotency([event], 'group-A', handler);
        // Retry — simulating a Kafka consumer re-delivering the same message
        await withIdempotency([event], 'group-A', handler);

        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('calls the handler for different groupIds with the same eventId', async () => {
        const handlerA = jest.fn(async () => {}) as any;
        const handlerB = jest.fn(async () => {}) as any;
        const event = createEvent('PROJECT_DELETED', 'key-4', {});

        await withIdempotency([event], 'consumer-group-A', handlerA);
        await withIdempotency([event], 'consumer-group-B', handlerB);

        expect(handlerA).toHaveBeenCalledTimes(1);
        expect(handlerB).toHaveBeenCalledTimes(1);
    });

    it('processes only unprocessed events in a mixed batch', async () => {
        const eventAlreadyProcessed = createEvent('X', 'k1', {});
        const eventNew = createEvent('X', 'k2', {});

        // Pre-process the first event
        await withIdempotency(
            [eventAlreadyProcessed],
            'group-Z',
            jest.fn(async () => {}) as any,
        );

        const handler = jest.fn(async () => {}) as any;
        await withIdempotency(
            [eventAlreadyProcessed, eventNew],
            'group-Z',
            handler,
        );

        // Handler should only be called with the NEW event
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith([eventNew]);
    });

    it('does nothing for an empty event list', async () => {
        const handler = jest.fn(async () => {}) as any;
        await withIdempotency([], 'group-A', handler);
        expect(handler).not.toHaveBeenCalled();
    });
});
