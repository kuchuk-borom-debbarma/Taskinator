import type { TraceMetadata, TraceStepOptions } from './contracts.ts';
import { TopoTracerHttpProvider } from './providers/TopoTracerHttpProvider.ts';
import { TracingService } from './TracingService.ts';

export type {
    TraceEventInput,
    TraceMetadata,
    TraceStepOptions,
    TracingProvider,
} from './contracts.ts';
export { TopoTracerHttpProvider } from './providers/TopoTracerHttpProvider.ts';
export { safeTraceData } from './sanitize.ts';
export { TracingService } from './TracingService.ts';

export const tracingService = new TracingService(new TopoTracerHttpProvider());

export function initTracing() {
    tracingService.init();
}

export async function shutdownTracing() {
    await tracingService.shutdown();
}

export function isTracingActive(): boolean {
    return tracingService.isActive();
}

export function activeTraceMetadata(edgeLabel = 'emits'): TraceMetadata | null {
    return tracingService.activeMetadata(edgeLabel);
}

export function attachTraceMetadata<T>(payload: T, edgeLabel = 'emits'): T {
    return tracingService.attachMetadata(payload, edgeLabel);
}

export async function traceMutation<T>(
    operationName: string,
    data: Record<string, unknown>,
    fn: () => T | Promise<T>,
): Promise<T> {
    return await tracingService.traceMutation(operationName, data, fn);
}

export async function traceStep<T>(
    name: string,
    options: TraceStepOptions,
    fn: () => T | Promise<T>,
): Promise<T> {
    return await tracingService.traceStep(name, options, fn);
}

export async function continueTraceFromMetadata<T>(
    metadata: TraceMetadata | null | undefined,
    name: string,
    options: TraceStepOptions,
    fn: () => T | Promise<T>,
): Promise<T> {
    return await tracingService.continueFromMetadata(
        metadata,
        name,
        options,
        fn,
    );
}

export function traceService<T extends object>(
    serviceName: string,
    service: T,
): T {
    return tracingService.traceService(serviceName, service);
}

export function traceResolverMap<T extends Record<string, any>>(
    resolvers: T,
): T {
    return tracingService.traceResolverMap(resolvers);
}

export function extractTraceMetadata(payload: unknown): TraceMetadata | null {
    return tracingService.extractMetadata(payload);
}
