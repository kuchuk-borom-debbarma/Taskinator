import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from '@jest/globals';
import {
    attachTraceMetadata,
    safeTraceData,
    shutdownTracing,
    traceMutation,
} from '../index.ts';

describe('Taskinator Topo-Tracer helper', () => {
    const originalFetch = globalThis.fetch;
    const originalSampleRate = process.env.TOPO_TRACER_SAMPLE_RATE;
    const originalUrl = process.env.TOPO_TRACER_URL;

    beforeEach(async () => {
        await shutdownTracing();
        process.env.TOPO_TRACER_SAMPLE_RATE = '1';
        process.env.TOPO_TRACER_URL = 'http://topo.test';
        globalThis.fetch = jest.fn(async () => new Response('{}')) as any;
    });

    afterEach(async () => {
        await shutdownTracing();
        globalThis.fetch = originalFetch;
        process.env.TOPO_TRACER_SAMPLE_RATE = originalSampleRate;
        process.env.TOPO_TRACER_URL = originalUrl;
        jest.restoreAllMocks();
    });

    it('redacts secrets but preserves debug-rich business fields', () => {
        const data = safeTraceData({
            taskId: 'task-1',
            title: 'Fix tracing',
            email: 'user@example.com',
            password_raw: 'secret',
            authorization: 'Bearer token',
            nested: {
                jwt: 'signed',
                status: 'DONE',
            },
        });

        expect(data).toMatchObject({
            taskId: 'task-1',
            title: 'Fix tracing',
            email: 'user@example.com',
            password_raw: '[REDACTED]',
            authorization: '[REDACTED]',
            nested: {
                jwt: '[REDACTED]',
                status: 'DONE',
            },
        });
    });

    it('attaches durable trace metadata while a mutation trace is active', async () => {
        const payload = await traceMutation(
            'UpdateTask',
            { userId: 'user-1' },
            async () => attachTraceMetadata({ type: 'task.updated' }, 'emits'),
        );

        expect(payload).toMatchObject({
            type: 'task.updated',
            _trace: {
                edgeLabel: 'emits',
                sourceImportance: 0,
            },
        });
        expect(typeof (payload as any)._trace.traceId).toBe('string');
        expect(typeof (payload as any)._trace.sourceNodeId).toBe('string');
    });

    it('never throws when the Topo-Tracer backend is unavailable', async () => {
        globalThis.fetch = jest.fn(async () => {
            throw new Error('offline');
        }) as any;

        await expect(
            traceMutation('CreateProject', { projectId: 'p1' }, async () => ({
                ok: true,
            })),
        ).resolves.toEqual({ ok: true });

        await expect(shutdownTracing()).resolves.toBeUndefined();
    });
});
