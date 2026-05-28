import { getTraceEnvelope } from '../../../infra/tracing.ts';
import type { OutboxEntry } from '../../contracts/index.ts';
import { eventStoreProvider } from '../../events/index.ts';

export type { OutboxEntry } from '../../contracts/index.ts';

/**
 * Encapsulates all interactions with the Transactional Outbox.
 * Ensures consistent signaling logic across the system.
 *
 * Automatically stamps the current distributed trace context into every event
 * payload so consumers on any pod can continue the causal trace chain.
 */
export const appendEventsToOutbox = async (
    trx: any,
    entries: OutboxEntry[],
): Promise<void> => {
    const traceContext = getTraceEnvelope();

    const stamped: OutboxEntry[] = traceContext
        ? entries.map((e) => ({
              ...e,
              payload: { ...e.payload, traceContext },
          }))
        : entries;

    await eventStoreProvider.appendOutboxEvents(trx, stamped);
};
