export type TraceStatus = 'ok' | 'error' | 'warning' | 'open';

export type TraceEntityType = 'node' | 'edge';

export type TraceEventType =
    | 'node.started'
    | 'node.ended'
    | 'edge.started'
    | 'edge.ended';

export type TraceMetadata = {
    traceId: string;
    sourceNodeId: string;
    sourceImportance: number;
    edgeLabel: string;
};

export type TraceEventInput = {
    eventId: string;
    traceId: string;
    entityId: string;
    entityType: TraceEntityType;
    eventType: TraceEventType;
    occurredAtUnixMs: number;
    name?: string | null;
    importanceLevel?: number | null;
    fromNodeId?: string | null;
    toNodeId?: string | null;
    label?: string | null;
    status?: TraceStatus | null;
    data?: Record<string, unknown>;
};

export type TraceStepOptions = {
    importanceLevel?: number;
    edgeLabel?: string;
    data?: Record<string, unknown>;
};

export type TraceContext<TNode> = {
    traceId: string;
    root: TNode;
    current: TNode;
    depth: number;
};

export type TracingConfig = {
    sampleRate: number;
};

export interface TracingProvider {
    readonly name: string;
    init(): void;
    shutdown(): Promise<void>;
    emit(event: TraceEventInput): void;
}
