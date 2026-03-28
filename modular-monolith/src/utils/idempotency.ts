import { db } from '../database';
import { getTimeString } from './utils';

/**
 * Batch idempotency wrapper for high-performance event processing.
 *
 * Filters an array of events and returns only those that haven't been processed yet.
 * Marks them as processed in a single "INSERT ... ON CONFLICT DO NOTHING" query.
 */
export async function withBatchIdempotency(
    events: any[],
    consumerGroup: string,
    handler: (unprocessedEvents: any[]) => Promise<void>,
): Promise<void> {
    if (events.length === 0) return;

    await db.transaction().execute(async (trx) => {
        // 1. Attempt to record all events in the batch
        const results = await trx
            .insertInto('processed_event')
            .values(
                events.map((event) => ({
                    event_id: event.eventId,
                    consumer_group: consumerGroup,
                    processed_at: getTimeString(),
                })),
            )
            .onConflict((oc) => oc.doNothing())
            .returning('event_id')
            .execute();

        const processedIds = new Set(results.map((r) => r.event_id));

        // 2. Filter the events to only those that were successfully inserted (i.e. not previously processed)
        const unprocessedEvents = events.filter((event) =>
            processedIds.has(event.eventId),
        );

        if (unprocessedEvents.length === 0) {
            console.log(
                `[Idempotency] All ${events.length} events already processed by ${consumerGroup}. Skipping.`,
            );
            return;
        }

        // 3. Execute the handler with the filtered events
        try {
            await handler(unprocessedEvents);
        } catch (error) {
            console.error(
                `[Idempotency] Error processing batch of ${unprocessedEvents.length} events:`,
                error,
            );
            throw error;
        }
    });
}
