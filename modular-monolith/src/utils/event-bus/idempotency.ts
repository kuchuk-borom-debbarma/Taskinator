import { v4 as uuid } from 'uuid';
import { getTimeString } from '../utils.ts';
import type { DomainEvent } from './types.ts';

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
