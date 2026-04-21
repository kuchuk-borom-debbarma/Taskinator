export interface DomainEvent<T = any> {
    eventId: string;
    type: string;
    key: string | null;
    data: T;
    timestamp: string;
}

export interface Bus {
    /**
     * Publish one or more events. Routing to topics is handled automatically based on type.
     */
    publish(
        topic: string,
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
        topic: string,
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
        options?: { batch?: boolean; manualIdempotency?: boolean },
    ): Promise<void>;

    init(): Promise<void>;

    destroy(): Promise<void>;
}
