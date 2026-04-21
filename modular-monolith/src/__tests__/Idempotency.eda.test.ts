/**
 * TIER 2 EDA: Idempotency Engine Integration Tests
 *
 * Verifies the `claimEventsAtomic` function using a real DB-backed
 * `processed_event` table to guarantee exactly-once processing.
 *
 * - First claim: returns the events and inserts processed_event rows
 * - Retry (same eventId, same groupId): returns empty list (already claimed)
 * - Same eventId, different groupId: each group claims independently
 * - Transactional Safety: rolls back marker if parent transaction fails
 */
import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { db } from '../database/index.ts';
import {
    claimEventsAtomic,
    createEvent,
} from '../utils/event-bus/idempotency.ts';
import { cleanupDb, destroyDb } from './helpers/db.ts';

describe('claimEventsAtomic — Real DB Integration', () => {
    beforeEach(async () => {
        await cleanupDb();
    });

    afterAll(async () => {
        await cleanupDb();
        await destroyDb();
    });

    it('successfully claims a new event and returns it', async () => {
        await db.transaction().execute(async (trx) => {
            const event = createEvent('PROJECT_CREATED', 'key-1', {
                projectId: 'p1',
            });

            const unprocessed = await claimEventsAtomic(
                trx,
                [event],
                'group-A',
            );

            expect(unprocessed).toHaveLength(1);
            expect(unprocessed[0]!.eventId).toBe(event.eventId);
        });

        const rows = await db
            .selectFrom('processed_event')
            .selectAll()
            .execute();
        expect(rows).toHaveLength(1);
    });

    it('returns empty list if events were already claimed by the same group', async () => {
        const event = createEvent('PROJECT_CREATED', 'key-2', {});
        const groupId = 'group-A';

        // First Claim
        await db.transaction().execute(async (trx) => {
            await claimEventsAtomic(trx, [event], groupId);
        });

        // Second Claim (Retry)
        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(trx, [event], groupId);
            expect(unprocessed).toHaveLength(0);
        });
    });

    it('rollbacks processed_event marker if transaction fails', async () => {
        const event = createEvent('PROJECT_CREATED', 'key-fail', {});
        const groupId = 'group-fail';

        try {
            await db.transaction().execute(async (trx) => {
                await claimEventsAtomic(trx, [event], groupId);
                throw new Error('Simulation Failure');
            });
        } catch (err) {
            // Error caught
        }

        // Verify NO marker was inserted because of rollback
        const rows = await db
            .selectFrom('processed_event')
            .selectAll()
            .where('event_id', '=', event.eventId as any)
            .where('consumer_group', '=', groupId)
            .execute();

        expect(rows).toHaveLength(0);
    });

    it('allows different groups to claim the same event independently', async () => {
        const event = createEvent('PROJECT_DELETED', 'key-4', {});

        await db.transaction().execute(async (trx) => {
            const claim1 = await claimEventsAtomic(trx, [event], 'group-1');
            expect(claim1).toHaveLength(1);
        });

        await db.transaction().execute(async (trx) => {
            const claim2 = await claimEventsAtomic(trx, [event], 'group-2');
            expect(claim2).toHaveLength(1);
        });

        const rows = await db
            .selectFrom('processed_event')
            .selectAll()
            .execute();
        expect(rows).toHaveLength(2);
    });

    it('correctly filters a mixed batch of new and processed events', async () => {
        const event1 = createEvent('X', 'k1', {});
        const event2 = createEvent('X', 'k2', {});
        const groupId = 'group-mixed';

        // Pre-claim event1
        await db.transaction().execute(async (trx) => {
            await claimEventsAtomic(trx, [event1], groupId);
        });

        // Try to claim both
        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                [event1, event2],
                groupId,
            );
            expect(unprocessed).toHaveLength(1);
            expect(unprocessed[0]!.eventId).toBe(event2.eventId);
        });
    });
});
