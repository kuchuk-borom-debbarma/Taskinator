import { db } from '../../database/index.ts';
import { claimEventsAtomic } from './idempotency.ts';
import { appendEventsToOutbox, type OutboxEntry } from './OutboxQueries.ts';
import type { DomainEvent } from './types.ts';

/**
 * Generic service to encapsulate the Smart Aggregator lifecycle.
 */
export class AggregatorService {
    /**
     * Orchestrates the atomic aggregator lifecycle:
     * 1. Start a transaction.
     * 2. Claim events (idempotency check).
     * 3. Fold unprocessed events using the provided folder callback.
     * 4. Append resulting signals to the transactional outbox.
     *
     * @param groupId Unique consumer group ID for idempotency tracking.
     * @param events Batch of domain events from Kafka.
     * @param folder Callback to consolidate events into outbox entries.
     */
    async processAggregatorBatch(
        groupId: string,
        events: DomainEvent[],
        folder: (unprocessed: DomainEvent[]) => OutboxEntry[],
    ): Promise<void> {
        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(trx, events, groupId);
            if (unprocessed.length === 0) return;

            const entries = folder(unprocessed);
            if (entries.length > 0) {
                await appendEventsToOutbox(trx, entries);
            }
        });
    }
}

export const aggregatorService = new AggregatorService();
