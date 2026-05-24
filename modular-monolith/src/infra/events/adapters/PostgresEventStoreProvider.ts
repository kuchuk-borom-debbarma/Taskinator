import type { EventStorePort, OutboxEntry } from '../../contracts/index.ts';
import type { DomainEvent } from '../../utils/event-bus/types.ts';
import { getTimeString } from '../../utils/utils.ts';

export class PostgresEventStoreProvider implements EventStorePort {
    readonly name = 'postgres-event-store';

    async appendOutboxEvents(trx: any, entries: OutboxEntry[]): Promise<void> {
        if (entries.length === 0) return;

        await trx.insertInto('outbox_events').values(entries).execute();
    }

    async claimEvents(
        trx: any,
        events: DomainEvent[],
        groupId: string,
    ): Promise<DomainEvent[]> {
        if (events.length === 0) return [];

        const results = await trx
            .insertInto('processed_event')
            .values(
                events.map((event) => ({
                    event_id: event.eventId,
                    consumer_group: groupId,
                    processed_at: getTimeString(),
                })),
            )
            .onConflict((oc: any) => oc.doNothing())
            .returning('event_id')
            .execute();

        const processedIds = new Set(results.map((row: any) => row.event_id));
        return events.filter((event) => processedIds.has(event.eventId));
    }
}
