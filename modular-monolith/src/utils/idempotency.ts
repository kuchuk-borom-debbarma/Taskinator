import { db } from '../database';
import { getTimeString } from './utils';

/**
 * Idempotency wrapper for event processing.
 * 
 * At 10k RPS, this uses a high-performance "INSERT ... ON CONFLICT DO NOTHING"
 * check within a transaction.
 * 
 * @param eventId The unique ID of the event being processed
 * @param consumerGroup The group ID of the consumer
 * @param handler The actual processing logic to execute if not already processed
 */
export async function withIdempotency(
    eventId: string,
    consumerGroup: string,
    handler: () => Promise<void>
): Promise<void> {
    await db.transaction().execute(async (trx) => {
        // 1. Attempt to record the event for this consumer group
        // If it already exists, result will be empty
        const result = await trx
            .insertInto('processedEvent')
            .values({
                event_id: eventId,
                consumer_group: consumerGroup,
                processed_at: getTimeString(),
            })
            .onConflict((oc) => oc.doNothing())
            .returning('event_id')
            .executeTakeFirst();

        // 2. If result is undefined, it means the event was already processed
        if (!result) {
            console.log(`[Idempotency] Event ${eventId} already processed by ${consumerGroup}. Skipping.`);
            return;
        }

        // 3. Execute the handler
        try {
            await handler();
        } catch (error) {
            console.error(`[Idempotency] Error processing event ${eventId}:`, error);
            throw error; // Transaction will rollback
        }
    });
}
