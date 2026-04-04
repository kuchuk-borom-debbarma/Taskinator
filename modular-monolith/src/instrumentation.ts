import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
    serviceName: 'taskinator-modular-monolith',
    traceExporter: new OTLPTraceExporter({
        url: 'http://localhost:4318/v1/traces',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
});

try {
    sdk.start();
    console.log(
        '[OTel] Tracing initialized and pointing to locally hosted Jaeger OTLP receiver (localhost:4318)',
    );
} catch (error) {
    console.error('[OTel] Error initializing tracing', error);
}

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('[OTel] Tracing terminated'))
        .catch((error) =>
            console.log('[OTel] Error terminating tracing', error),
        )
        .finally(() => process.exit(0));
});
