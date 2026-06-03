import { AsyncLocalStorage } from 'node:async_hooks';
import { v4 as uuid } from 'uuid';
import type {
    TraceContext,
    TraceEventInput,
    TraceMetadata,
    TraceStatus,
    TraceStepOptions,
    TracingProvider,
} from './contracts.ts';
import { safeTraceData } from './sanitize.ts';

type ActiveTraceContext = TraceContext<TraceNode>;

export class TracingService {
    private readonly storage = new AsyncLocalStorage<ActiveTraceContext>();
    private isInitialized = false;

    constructor(private readonly provider: TracingProvider) {}

    init() {
        if (this.isInitialized) return;
        this.provider.init();
        this.isInitialized = true;
    }

    async shutdown() {
        await this.provider.shutdown();
        this.isInitialized = false;
    }

    isActive(): boolean {
        return Boolean(this.storage.getStore());
    }

    activeMetadata(edgeLabel = 'emits'): TraceMetadata | null {
        const context = this.storage.getStore();
        if (!context) return null;
        return {
            traceId: context.traceId,
            sourceNodeId: context.current.id,
            sourceImportance: context.current.importanceLevel,
            edgeLabel,
        };
    }

    attachMetadata<T>(payload: T, edgeLabel = 'emits'): T {
        const metadata = this.activeMetadata(edgeLabel);
        if (!metadata || !payload || typeof payload !== 'object')
            return payload;
        return {
            ...(payload as Record<string, unknown>),
            _trace: metadata,
        } as T;
    }

    async traceMutation<T>(
        operationName: string,
        data: Record<string, unknown>,
        fn: () => T | Promise<T>,
    ): Promise<T> {
        return await this.traceRoot(
            `GraphQL Mutation ${operationName}`,
            0,
            data,
            fn,
        );
    }

    async traceStep<T>(
        name: string,
        options: TraceStepOptions,
        fn: () => T | Promise<T>,
    ): Promise<T> {
        const context = this.storage.getStore();
        if (!context) return await fn();

        const parent = context.current;
        const child = TraceNode.start(this.emit, {
            traceId: context.traceId,
            name,
            importanceLevel:
                options.importanceLevel ?? parent.importanceLevel + 1,
            data: safeTraceData(options.data ?? {}),
        });
        parent.connectTo(child, options.edgeLabel ?? 'calls');

        return await this.storage.run(
            {
                traceId: context.traceId,
                root: context.root,
                current: child,
                depth: context.depth + 1,
            },
            async () => {
                try {
                    const result = await fn();
                    child.end(hasGraphQLErrors(result) ? 'error' : 'ok');
                    return result;
                } catch (error) {
                    child.end('error');
                    throw error;
                }
            },
        );
    }

    async continueFromMetadata<T>(
        metadata: TraceMetadata | null | undefined,
        name: string,
        options: TraceStepOptions,
        fn: () => T | Promise<T>,
    ): Promise<T> {
        if (!metadata?.traceId || !metadata.sourceNodeId) {
            return await this.traceRoot(
                name,
                options.importanceLevel ?? 2,
                options.data ?? {},
                fn,
            );
        }

        this.init();

        const node = TraceNode.start(this.emit, {
            traceId: metadata.traceId,
            name,
            importanceLevel:
                options.importanceLevel ??
                Math.max(2, metadata.sourceImportance),
            data: safeTraceData(options.data ?? {}),
        });

        TraceNode.connect(
            this.emit,
            metadata.traceId,
            metadata.sourceNodeId,
            node.id,
            options.edgeLabel ?? metadata.edgeLabel ?? 'consumes',
        );

        return await this.storage.run(
            {
                traceId: metadata.traceId,
                root: node,
                current: node,
                depth: Math.max(2, metadata.sourceImportance),
            },
            async () => {
                try {
                    const result = await fn();
                    node.end(hasGraphQLErrors(result) ? 'error' : 'ok');
                    return result;
                } catch (error) {
                    node.end('error');
                    throw error;
                }
            },
        );
    }

    traceService<T extends object>(serviceName: string, service: T): T {
        return new Proxy(service, {
            get: (target, prop, receiver) => {
                const value = Reflect.get(target, prop, receiver);
                if (typeof prop !== 'string' || typeof value !== 'function') {
                    return value;
                }
                if (prop === 'init' || prop === 'destroy')
                    return value.bind(target);

                return (...args: unknown[]) =>
                    this.traceStep(
                        `${serviceName}.${prop}`,
                        {
                            importanceLevel: 1,
                            edgeLabel: 'calls',
                            data: {
                                args: args.map((arg) => safeTraceData(arg)),
                            },
                        },
                        () => value.apply(target, args),
                    );
            },
        });
    }

    traceResolverMap<T extends Record<string, any>>(resolvers: T): T {
        for (const typeName of Object.keys(resolvers)) {
            if (typeName !== 'Mutation' && !typeName.endsWith('Mutation'))
                continue;
            const resolverGroup = resolvers[typeName];
            if (!resolverGroup || typeof resolverGroup !== 'object') continue;

            for (const fieldName of Object.keys(resolverGroup)) {
                const resolver = resolverGroup[fieldName];
                if (typeof resolver !== 'function') continue;

                resolverGroup[fieldName] = (...args: unknown[]) =>
                    this.traceStep(
                        `Resolver ${fieldName}`,
                        {
                            importanceLevel: 1,
                            edgeLabel: 'calls',
                            data: {
                                typeName,
                                fieldName,
                                args: safeTraceData(args[1]),
                            },
                        },
                        () => resolver(...args),
                    );
            }
        }

        return resolvers;
    }

    extractMetadata(payload: unknown): TraceMetadata | null {
        if (!payload || typeof payload !== 'object') return null;
        const metadata = (payload as Record<string, unknown>)._trace;
        if (!metadata || typeof metadata !== 'object') return null;
        const candidate = metadata as Record<string, unknown>;
        if (
            typeof candidate.traceId !== 'string' ||
            typeof candidate.sourceNodeId !== 'string'
        ) {
            return null;
        }

        return {
            traceId: candidate.traceId,
            sourceNodeId: candidate.sourceNodeId,
            sourceImportance:
                typeof candidate.sourceImportance === 'number'
                    ? candidate.sourceImportance
                    : 2,
            edgeLabel:
                typeof candidate.edgeLabel === 'string'
                    ? candidate.edgeLabel
                    : 'consumes',
        };
    }

    private async traceRoot<T>(
        name: string,
        importanceLevel: number,
        data: Record<string, unknown>,
        fn: () => T | Promise<T>,
    ): Promise<T> {
        if (!shouldTrace()) return await fn();

        this.init();

        const root = TraceNode.start(this.emit, {
            traceId: uuid(),
            name,
            importanceLevel,
            data: safeTraceData(data),
        });

        const context: ActiveTraceContext = {
            traceId: root.traceId,
            root,
            current: root,
            depth: 0,
        };

        return await this.storage.run(context, async () => {
            try {
                const result = await fn();
                root.end(hasGraphQLErrors(result) ? 'error' : 'ok');
                return result;
            } catch (error) {
                root.end('error');
                throw error;
            }
        });
    }

    private readonly emit = (event: TraceEventInput) => {
        this.init();
        this.provider.emit(event);
    };
}

class TraceNode {
    readonly id: string;
    readonly traceId: string;
    readonly name: string;
    readonly importanceLevel: number;
    private isEnded = false;

    private constructor(
        private readonly emit: (event: TraceEventInput) => void,
        input: {
            id?: string;
            traceId: string;
            name: string;
            importanceLevel: number;
            data?: Record<string, unknown>;
        },
    ) {
        this.id = input.id ?? uuid();
        this.traceId = input.traceId;
        this.name = input.name;
        this.importanceLevel = normalizeImportance(input.importanceLevel);

        this.emit({
            eventId: uuid(),
            traceId: this.traceId,
            entityId: this.id,
            entityType: 'node',
            eventType: 'node.started',
            occurredAtUnixMs: Date.now(),
            name: this.name,
            importanceLevel: this.importanceLevel,
            status: 'open',
            data: input.data,
        });
    }

    static start(
        emit: (event: TraceEventInput) => void,
        input: {
            traceId: string;
            name: string;
            importanceLevel: number;
            data?: Record<string, unknown>;
        },
    ) {
        return new TraceNode(emit, input);
    }

    static connect(
        emit: (event: TraceEventInput) => void,
        traceId: string,
        fromNodeId: string,
        toNodeId: string,
        label: string,
    ) {
        const edgeId = uuid();
        emit({
            eventId: uuid(),
            traceId,
            entityId: edgeId,
            entityType: 'edge',
            eventType: 'edge.started',
            occurredAtUnixMs: Date.now(),
            fromNodeId,
            toNodeId,
            label,
            status: 'open',
        });
        emit({
            eventId: uuid(),
            traceId,
            entityId: edgeId,
            entityType: 'edge',
            eventType: 'edge.ended',
            occurredAtUnixMs: Date.now(),
            status: 'ok',
        });
    }

    connectTo(target: TraceNode, label: string) {
        TraceNode.connect(this.emit, this.traceId, this.id, target.id, label);
    }

    end(status: TraceStatus = 'ok') {
        if (this.isEnded) return;
        this.isEnded = true;
        this.emit({
            eventId: uuid(),
            traceId: this.traceId,
            entityId: this.id,
            entityType: 'node',
            eventType: 'node.ended',
            occurredAtUnixMs: Date.now(),
            status,
        });
    }
}

function shouldTrace(): boolean {
    const sampleRate = Number(process.env.TOPO_TRACER_SAMPLE_RATE ?? '1');
    if (!Number.isFinite(sampleRate)) return true;
    if (sampleRate <= 0) return false;
    if (sampleRate >= 1) return true;
    return Math.random() < sampleRate;
}

function hasGraphQLErrors(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    const errors = (value as { errors?: unknown }).errors;
    return Array.isArray(errors) && errors.length > 0;
}

function normalizeImportance(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.floor(value));
}
