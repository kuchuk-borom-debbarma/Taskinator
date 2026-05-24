import { eventStoreProvider } from '../../events/index.ts';

export { createEvent } from './eventFactory.ts';

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
    return eventStoreProvider.claimEvents(trx, events, groupId);
}
