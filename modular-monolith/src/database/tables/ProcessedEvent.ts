import type { ColumnType } from 'kysely';

/**
 * Idempotency tracking table for Kafka events.
 *
 * At 10k RPS, this table should be PARTITIONED by processed_at.
 * event_id + consumer_group must be a composite primary key.
 */
export interface ProcessedEventTable {
    // We use a composite PK of (event_id, consumer_group)
    event_id: string;
    consumer_group: string;
    processed_at: ColumnType<Date, string | undefined, never>;
}

export type ProcessedEvent = {
    eventId: string;
    consumerGroup: string;
    processedAt: Date;
};
