import type { OutboxEntry } from '../../contracts/index.ts';
import { eventStoreProvider } from '../../events/index.ts';

export type { OutboxEntry } from '../../contracts/index.ts';

/**
 * Encapsulates all interactions with the Transactional Outbox.
 * Ensures consistent signaling logic across the system.
 */
export const appendEventsToOutbox = async (
    trx: any,
    entries: OutboxEntry[],
): Promise<void> => {
    await eventStoreProvider.appendOutboxEvents(trx, entries);
};
