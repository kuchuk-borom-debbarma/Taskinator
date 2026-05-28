import { AsyncLocalStorage } from 'node:async_hooks';
import { EdgeType, NodeType, type TraceNode, Tracer } from 'nodejs';
import type { TraceContext } from './utils/event-bus/types.ts';

export const tracingContext = new AsyncLocalStorage<TraceNode>();

export interface TraceOptions {
    containerId: string;
    containerName: string;
    containerType: string;
    name: string;
    nodeType?: NodeType | string;
}

/**
 * Returns the distributed trace envelope from the currently active trace node.
 * Inject this into outbox event payloads so consumers on any pod can continue
 * the originating trace via `traceMethod({ incomingTrace: ... })`.
 *
 * Returns undefined when there is no active trace context (e.g. during startup).
 */
export function getTraceEnvelope(): TraceContext | undefined {
    const node = tracingContext.getStore();
    if (!node) return undefined;
    return {
        traceId: node.traceId,
        nodeId: node.id,
        depth: node.depthIndex,
        publishedAt: new Date().toISOString(),
    };
}

/**
 * Traces a function execution, automatically nesting it within the active trace
 * context. Supports three modes:
 *
 * 1. **Child trace** — there is an active ALS node; nest under it (same or cross-container).
 * 2. **Continued trace** — no ALS node, but `incomingTrace` provided from a Kafka/event
 *    envelope; re-hydrate the causal chain via `Tracer.continueTrace()`.
 * 3. **Root trace** — no ALS node, no incoming trace; start a fresh root.
 */
export async function traceMethod<T>(
    opts: TraceOptions & { incomingTrace?: TraceContext },
    fn: (node?: TraceNode) => Promise<T>,
): Promise<T> {
    // Guard: if tracer isn't initialised (e.g. unit tests) run the fn directly.
    try {
        Tracer.getContainerId();
    } catch {
        return await fn();
    }

    const parentNode = tracingContext.getStore();

    // ── Mode 1: Active ALS context — nest under it ──────────────────────────
    if (parentNode) {
        if (parentNode.containerId !== opts.containerId) {
            // Cross-container boundary
            return await parentNode.traceChildInContainer(
                {
                    containerId: opts.containerId,
                    containerName: opts.containerName,
                    containerType: opts.containerType,
                    name: opts.name,
                    nodeType: opts.nodeType || NodeType.FUNCTION,
                    edgeType: EdgeType.KAFKA_MESSAGE,
                },
                async (childNode) => {
                    return await tracingContext.run(childNode, () =>
                        fn(childNode),
                    );
                },
            );
        } else {
            // Within-container child
            return await parentNode.traceChild(
                opts.name,
                opts.nodeType || NodeType.FUNCTION,
                async (childNode) => {
                    return await tracingContext.run(childNode, () =>
                        fn(childNode),
                    );
                },
            );
        }
    }

    // ── Mode 2: No ALS context, but a cross-process trace header arrived ────
    if (opts.incomingTrace) {
        const { traceId, nodeId, depth, publishedAt } = opts.incomingTrace;
        const node = Tracer.continueTrace(
            traceId,
            nodeId,
            opts.name,
            opts.nodeType || NodeType.MESSAGE_CONSUMER,
            depth,
            undefined, // group
            new Date(publishedAt), // scheduledAtLocal — when the event was published
            // gives Topo-Tracer the Kafka queue latency
        );
        node.markProcessed();
        try {
            return await tracingContext.run(node, () => fn(node));
        } catch (error: any) {
            node.metadata = {
                ...node.metadata,
                error: error.message || String(error),
            };
            throw error;
        } finally {
            node.markCompleted();
        }
    }

    // ── Mode 3: No context at all — start a new root trace ──────────────────
    const rootNode = Tracer.startTrace(
        opts.name,
        opts.nodeType || NodeType.FUNCTION,
    );
    rootNode.markProcessed();
    try {
        return await tracingContext.run(rootNode, () => fn(rootNode));
    } catch (error: any) {
        rootNode.metadata = {
            ...rootNode.metadata,
            error: error.message || String(error),
        };
        throw error;
    } finally {
        rootNode.markCompleted();
    }
}
