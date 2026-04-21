import type { Transaction } from 'kysely';
import { v4 as uuid } from 'uuid';
import { type Database, db } from '../../database';
import { getTimeString } from '../utils.ts';
import type { DomainEvent } from './types.ts';

/**
 * Transactional Idempotency Engine.
 *
 * Ensures At-Least-Once processing by wrapping the idempotency check,
 * business logic, and processed markers in a single atomic database transaction.
 */
export async function withIdempotency(
    events: DomainEvent[],
    groupId: string,
    handler: (
        unprocessed: DomainEvent[],
        trx: Transaction<Database>,
    ) => Promise<void>,
) {
    if (events.length === 0) return;

    await db.transaction().execute(async (trx) => {
        // Step 1: Identify which events have already been processed by this group.
        const alreadyProcessed = await trx
            .selectFrom('processed_event')
            .select('event_id')
            .where('consumer_group', '=', groupId)
            .where(
                'event_id',
                'in',
                events.map((e) => e.eventId),
            )
            .execute();

        const processedIds = new Set(alreadyProcessed.map((r) => r.event_id));
        const unprocessed = events.filter((e) => !processedIds.has(e.eventId));

        if (unprocessed.length > 0) {
            // Step 2: Run the business logic handler within the SAME transaction.
            await handler(unprocessed, trx);

            // Step 3: Mark the events as processed in the same transaction.
            await trx
                .insertInto('processed_event')
                .values(
                    unprocessed.map((e) => ({
                        event_id: e.eventId,
                        consumer_group: groupId,
                        processed_at: getTimeString(),
                    })),
                )
                .execute();
        }
    });
}

/**
 * Atomic Claim: Performs the idempotency check and 'Claims' the events
 * within an existing transaction.
 *
 * Returns only the filtered list of events that have NOT been processed yet.
 */
export async function claimEventsAtomic(
    trx: any,
    events: DomainEvent[],
    groupId: string,
): Promise<DomainEvent[]> {
    if (events.length === 0) return [];

    const results = await trx
        .insertInto('processed_event')
        .values(
            events.map((e) => ({
                event_id: e.eventId,
                consumer_group: groupId,
                processed_at: getTimeString(),
            })),
        )
        .onConflict((oc: any) => oc.doNothing())
        .returning('event_id')
        .execute();

    const processedIds = new Set(results.map((r: any) => r.event_id));
    return events.filter((e) => processedIds.has(e.eventId));
}

export function createEvent(
    type: string,
    key: string | null,
    data: any,
    id?: string,
): DomainEvent {
    return {
        eventId: id || uuid(),
        type,
        key,
        data,
        timestamp: getTimeString(),
    };
}
