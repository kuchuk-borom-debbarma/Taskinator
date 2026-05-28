/**
 * Carries the distributed trace context across async/network boundaries.
 * Serialised into every outbox event so consumers on any pod can continue
 * the originating trace instead of starting a disconnected root.
 */
export interface TraceContext {
    traceId: string; // UUID shared across the full causal chain
    nodeId: string; // ID of the node that published the event
    depth: number; // depthIndex of the publishing node
    publishedAt: string; // ISO timestamp of when the event was written to the outbox
    // → passed as scheduledAtLocal to continueTrace so Topo-Tracer
    //   can show Kafka queue latency (publish → consume gap)
}

export interface DomainEvent<T = any> {
    eventId: string;
    type: string;
    key: string | null;
    data: T;
    timestamp: string;
    /** Distributed trace propagation header — present when published inside an active trace. */
    traceContext?: TraceContext;
}

export interface Bus {
    /**
     * Publish one or more events to a logical stream.
     */
    publish(
        stream: string,
        type: string,
        payload:
            | { id?: string; key: string | null; data: any }
            | Array<{ id?: string; key: string | null; data: any }>,
    ): Promise<void>;

    /**
     * Subscribe to multiple event types within a consumer group.
     * Idempotency is handled automatically using the eventId.
     */
    subscribe(
        stream: string,
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
        options?: { batch?: boolean },
    ): Promise<void>;

    init(): Promise<void>;

    destroy(): Promise<void>;
}
