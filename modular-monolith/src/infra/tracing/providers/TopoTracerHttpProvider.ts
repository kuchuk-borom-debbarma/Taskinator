import { logger } from '../../logger/index.ts';
import type { TraceEventInput, TracingProvider } from '../contracts.ts';

const DEFAULT_TOPO_TRACER_URL = 'http://localhost:3999';
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_FLUSH_INTERVAL_MS = 1000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_QUEUE_SIZE = 10_000;

type TopoTracerHttpProviderConfig = {
    baseUrl: string;
    batchSize: number;
    flushIntervalMs: number;
    maxRetries: number;
    maxQueueSize: number;
};

export class TopoTracerHttpProvider implements TracingProvider {
    readonly name = 'topo-tracer-http';

    private events: TraceEventInput[] = [];
    private timer: ReturnType<typeof setInterval> | null = null;
    private isFlushing = false;
    private consecutiveFailures = 0;

    constructor(
        private readonly config: TopoTracerHttpProviderConfig = topoTracerHttpConfigFromEnv(),
    ) {}

    init() {
        if (this.timer) return;
        this.timer = setInterval(() => {
            this.flush().catch((error) =>
                logger.debug('[TopoTracer] Background flush failed', error),
            );
        }, this.config.flushIntervalMs);
        this.timer.unref?.();
    }

    async shutdown() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        await this.flush();
    }

    emit(event: TraceEventInput) {
        this.events.push(event);
        if (this.events.length > this.config.maxQueueSize) {
            this.events.splice(
                0,
                this.events.length - this.config.maxQueueSize,
            );
        }
        if (this.events.length >= this.config.batchSize) {
            setImmediate(() => {
                this.flush().catch((error) =>
                    logger.debug('[TopoTracer] Batch flush failed', error),
                );
            });
        }
    }

    private async flush(): Promise<void> {
        if (this.isFlushing) return;
        const events = this.events.splice(0, this.events.length);
        if (events.length === 0) return;

        this.isFlushing = true;
        try {
            const response = await fetch(
                `${this.config.baseUrl}/telemetry/events`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(events),
                },
            );
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            this.consecutiveFailures = 0;
        } catch (error) {
            this.consecutiveFailures += 1;
            if (this.consecutiveFailures <= this.config.maxRetries) {
                this.events = [...events, ...this.events].slice(
                    0,
                    this.config.maxQueueSize,
                );
            } else {
                this.consecutiveFailures = 0;
            }
            logger.debug('[TopoTracer] Failed to flush telemetry', error);
        } finally {
            this.isFlushing = false;
        }
    }
}

function topoTracerHttpConfigFromEnv(): TopoTracerHttpProviderConfig {
    return {
        baseUrl: process.env.TOPO_TRACER_URL || DEFAULT_TOPO_TRACER_URL,
        batchSize: DEFAULT_BATCH_SIZE,
        flushIntervalMs: DEFAULT_FLUSH_INTERVAL_MS,
        maxRetries: DEFAULT_MAX_RETRIES,
        maxQueueSize: DEFAULT_MAX_QUEUE_SIZE,
    };
}
