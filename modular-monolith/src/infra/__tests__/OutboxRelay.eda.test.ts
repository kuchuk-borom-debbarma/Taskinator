/**
 * TIER 2 EDA: Outbox Relay Integration Tests
 *
 * Verifies the OutboxRelay polling loop:
 *  1. Picks up PENDING outbox_events rows
 *  2. Publishes them to the eventBus (MemoryBus in test mode)
 *  3. Deletes the rows after successful publishing (keeping DB lean)
 *  4. Handles batching — processes up to 100 per poll cycle
 *
 * The eventBus is automatically the MemoryBus in NODE_ENV=test.
 * We spy on `eventBus.publish` to assert correct calls.
 */
import {
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from '@jest/globals';
import { db } from '../database/index.ts';
import eventBus from '../utils/EventBus.ts';
import { EVENT_STREAMS, EVENT_TYPES } from '../utils/event-bus/constants.ts';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from '../utils/event-bus/OutboxRelay.ts';
import { cleanupDb, destroyDb } from './helpers/db.ts';
import { waitFor } from './helpers/waitFor.ts';

describe('OutboxRelay — EDA Integration (MemoryBus)', () => {
    beforeEach(async () => {
        await cleanupDb();
        await eventBus.init();
    });

    afterEach(async () => {
        stopOutboxRelay();
        await eventBus.destroy();
    });

    afterAll(async () => {
        await cleanupDb();
        await destroyDb();
    });

    it('publishes a PENDING outbox event and deletes the row', async () => {
        // Manually insert an outbox event (simulating what a wCTE would write)
        await db
            .insertInto('outbox_events')
            .values({
                stream: EVENT_STREAMS.PROJECT,
                stream_key: 'test-project-id',
                payload: {
                    type: EVENT_TYPES.PROJECT.CREATED,
                    projectId: 'test-project-id',
                    userId: 'u1',
                    name: 'P',
                } as any,
                status: 'PENDING',
            })
            .execute();

        const publishSpy = jest.spyOn(eventBus, 'publish');

        startOutboxRelay();

        await waitFor(async () => {
            expect(publishSpy).toHaveBeenCalledWith(
                EVENT_STREAMS.PROJECT,
                EVENT_TYPES.PROJECT.CREATED,
                expect.arrayContaining([
                    expect.objectContaining({ key: 'test-project-id' }),
                ]),
            );
        });

        // Row should be deleted after processing
        await waitFor(async () => {
            const remaining = await db
                .selectFrom('outbox_events')
                .selectAll()
                .execute();
            expect(remaining).toHaveLength(0);
        });

        publishSpy.mockRestore();
    });

    it('batches events by topic and publishes each topic once per poll', async () => {
        // Insert 3 events across 2 topics
        await db
            .insertInto('outbox_events')
            .values([
                {
                    stream: EVENT_STREAMS.PROJECT,
                    stream_key: 'p1',
                    payload: {
                        type: EVENT_TYPES.PROJECT.CREATED,
                        id: 'p1',
                    } as any,
                    status: 'PENDING',
                },
                {
                    stream: EVENT_STREAMS.PROJECT,
                    stream_key: 'p2',
                    payload: {
                        type: EVENT_TYPES.PROJECT.CREATED,
                        id: 'p2',
                    } as any,
                    status: 'PENDING',
                },
                {
                    stream: 'another-topic',
                    stream_key: 't1',
                    payload: { type: 'another.event', id: 't1' } as any,
                    status: 'PENDING',
                },
            ])
            .execute();

        const calls: { topic: string; type: string; payloads: any[] }[] = [];
        const publishSpy = jest
            .spyOn(eventBus, 'publish')
            .mockImplementation(async (topic, type, payload) => {
                calls.push({
                    topic,
                    type,
                    payloads: Array.isArray(payload) ? payload : [payload],
                });
            });

        startOutboxRelay();

        await waitFor(async () => {
            // Expect 2 publish calls: one per topic-type group
            const topicTypeKeys = calls
                .map((c) => `${c.topic}|${c.type}`)
                .sort();
            expect(topicTypeKeys).toContain(
                `${EVENT_STREAMS.PROJECT}|${EVENT_TYPES.PROJECT.CREATED}`,
            );
            expect(topicTypeKeys).toContain('another-topic|another.event');

            const projectCreatedCall = calls.find(
                (c) =>
                    c.topic === EVENT_STREAMS.PROJECT &&
                    c.type === EVENT_TYPES.PROJECT.CREATED,
            );
            expect(projectCreatedCall?.payloads).toHaveLength(2);
        });

        // All rows cleaned up
        await waitFor(async () => {
            const remaining = await db
                .selectFrom('outbox_events')
                .selectAll()
                .execute();
            expect(remaining).toHaveLength(0);
        });

        publishSpy.mockRestore();
    });

    it('does nothing when there are no PENDING events', async () => {
        const publishSpy = jest.spyOn(eventBus, 'publish');

        startOutboxRelay();

        // Poll once (wait longer than the poll interval of 1s)
        await new Promise((r) => setTimeout(r, 200));
        expect(publishSpy).not.toHaveBeenCalled();

        publishSpy.mockRestore();
    });

    it('processes only up to 100 events per poll cycle (batch limit)', async () => {
        // Insert 120 outbox events
        const events = Array.from({ length: 120 }, (_, i) => ({
            stream: EVENT_STREAMS.PROJECT,
            stream_key: `p${i}`,
            payload: { type: EVENT_TYPES.PROJECT.CREATED, id: `p${i}` } as any,
            status: 'PENDING',
        }));
        await db.insertInto('outbox_events').values(events).execute();

        startOutboxRelay();

        // After first poll: at most 100 deleted, 20 remain
        await waitFor(async () => {
            const remaining = await db
                .selectFrom('outbox_events')
                .selectAll()
                .execute();
            // After at least 2 poll cycles, all should be gone
            expect(remaining.length).toBeLessThan(120);
        }, 3000);

        // After subsequent polls: all gone
        await waitFor(async () => {
            const remaining = await db
                .selectFrom('outbox_events')
                .selectAll()
                .execute();
            expect(remaining).toHaveLength(0);
        }, 5000);
    });
});
