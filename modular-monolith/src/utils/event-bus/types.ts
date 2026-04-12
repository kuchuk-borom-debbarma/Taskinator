export interface DomainEvent<T = any> {
    eventId: string;
    type: string;
    key: string;
    data: T;
    timestamp: string;
}

export interface Bus {
    /**
     * Publish one or more events. Routing to topics is handled automatically based on type.
     */
    publish(
        type: string,
        payload: { key: string; data: any } | Array<{ key: string; data: any }>,
    ): Promise<void>;

    /**
     * Subscribe to multiple event types within a consumer group.
     * Idempotency is handled automatically using the eventId.
     */
    subscribe(
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
    ): Promise<void>;

    init(): Promise<void>;

    destroy(): Promise<void>;
}
