import type { ColumnType } from 'kysely';

export interface OutboxEventTable {
    id: ColumnType<string, string | undefined, never>;
    kafka_topic: string;
    kafka_key: string | null;
    payload: any;
    status: ColumnType<string, string | undefined, string>;
    created_at: ColumnType<string, string | undefined, never>;
}
