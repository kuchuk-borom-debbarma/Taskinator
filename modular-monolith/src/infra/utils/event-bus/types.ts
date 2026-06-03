export interface DomainEvent<T = any> {
    eventId: string;
    type: string;
    key: string | null;
    data: T;
    timestamp: string;
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
