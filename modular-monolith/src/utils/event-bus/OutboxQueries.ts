export interface OutboxEntry {
    kafka_topic: string;
    kafka_key: string;
    payload: any;
}

/**
 * Encapsulates all interactions with the Transactional Outbox.
 * Ensures consistent signaling logic across the system.
 */
export const appendEventsToOutbox = async (
    trx: any,
    entries: OutboxEntry[],
): Promise<void> => {
    if (entries.length === 0) return;

    await trx.insertInto('outbox_events').values(entries).execute();
};
