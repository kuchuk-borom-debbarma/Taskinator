import type { ColumnType } from 'kysely';

export interface OutboxEventTable {
    id: ColumnType<number, number | undefined, never>;
    event_id: ColumnType<string, string | undefined, never>;
    stream: string;
    stream_key: string | null;
    payload: any;
    status: ColumnType<string, string | undefined, string>;
    created_at: ColumnType<string, string | undefined, never>;
}
