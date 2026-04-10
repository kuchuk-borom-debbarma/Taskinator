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
import { cleanupDb, destroyDb } from './helpers/db.ts';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from '../utils/event-bus/OutboxRelay.ts';
import eventBus from '../utils/EventBus.ts';
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
                kafka_topic: 'project.created',
                kafka_key: 'test-project-id',
                payload: {
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
                'PROJECT_CREATED',
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
                    kafka_topic: 'project.created',
                    kafka_key: 'p1',
                    payload: { id: 'p1' } as any,
                    status: 'PENDING',
                },
                {
                    kafka_topic: 'project.created',
                    kafka_key: 'p2',
                    payload: { id: 'p2' } as any,
                    status: 'PENDING',
                },
                {
                    kafka_topic: 'project.task.created',
                    kafka_key: 't1',
                    payload: { id: 't1' } as any,
                    status: 'PENDING',
                },
            ])
            .execute();

        const calls: { topic: string; payloads: any[] }[] = [];
        const publishSpy = jest
            .spyOn(eventBus, 'publish')
            .mockImplementation(async (topic, payload) => {
                calls.push({
                    topic,
                    payloads: Array.isArray(payload) ? payload : [payload],
                });
            });

        startOutboxRelay();

        await waitFor(async () => {
            // Expect 2 publish calls: one per topic
            const topicCalls = calls.map((c) => c.topic).sort();
            expect(topicCalls).toContain('PROJECT_CREATED');
            expect(topicCalls).toContain('PROJECT_TASK_CREATED');

            const projectCreatedCall = calls.find(
                (c) => c.topic === 'PROJECT_CREATED',
            );
            expect(projectCreatedCall!.payloads).toHaveLength(2);
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
            kafka_topic: 'project.created',
            kafka_key: `p${i}`,
            payload: { id: `p${i}` } as any,
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
