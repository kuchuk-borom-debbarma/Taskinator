import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { KAFKA_EVENTS, KAFKA_TOPICS } from '../../../utils/event-bus/index.js';
import { appendEventsToOutbox } from '../../../utils/event-bus/OutboxQueries.js';
import { PipelineEventListener } from './PipelineEventListener.js';

// Mock dependencies
mock.module('../../../database/index.js', () => ({
    db: {
        transaction: () => ({
            execute: (callback: any) =>
                callback({
                    insertInto: () => ({
                        values: () => ({ execute: async () => {} }),
                    }),
                    values: () => ({ execute: async () => {} }),
                    execute: async () => {},
                }),
        }),
    },
}));

mock.module('../../../logger/index.js', () => ({
    logger: {
        info: mock(() => {}),
        error: mock(() => {}),
    },
}));

mock.module('../../../utils/EventBus.ts', () => ({
    default: {
        subscribe: mock(async () => {}),
    },
}));

mock.module('../../../utils/event-bus/idempotency.ts', () => ({
    claimEventsAtomic: mock(async (trx, events) => events),
}));

mock.module('../../../utils/event-bus/OutboxQueries.ts', () => ({
    appendEventsToOutbox: mock(async () => {}),
}));

describe('PipelineEventListener', () => {
    let listener: PipelineEventListener;
    let mockOrchestrator: any;
    let mockAggregator: any;

    beforeEach(() => {
        mockOrchestrator = {
            executeStep: mock(async () => ({ status: 'SUCCESS' })),
        };
        mockAggregator = {
            push: mock(() => {}),
        };

        // Clear module mocks
        (appendEventsToOutbox as any).mockClear();

        listener = new PipelineEventListener(mockOrchestrator, mockAggregator);
    });

    it('should process TRIGGER event and execute first step', async () => {
        mockOrchestrator.executeStep.mockImplementation(async () => ({
            status: 'SUCCESS',
        }));

        const event = {
            data: {
                autopilotId: 'auto-1',
                entityType: 'task',
                entityId: '123',
            },
        };

        await (listener as any).onTrigger([event]);

        expect(mockOrchestrator.executeStep).toHaveBeenCalledWith(
            'auto-1',
            expect.objectContaining({
                stepIndex: 0,
                entityType: 'task',
                entityId: '123',
                depth: 0,
            }),
        );
    });

    it('should increment depth on recursive TRIGGER', async () => {
        mockOrchestrator.executeStep.mockImplementation(async () => ({
            status: 'SUCCESS',
        }));

        const event = {
            data: {
                autopilotId: 'auto-1',
                entityType: 'task',
                entityId: '123',
                isRecursiveTrigger: true,
                depth: 5,
            },
        };

        await (listener as any).onTrigger([event]);

        expect(mockOrchestrator.executeStep).toHaveBeenCalledWith(
            'auto-1',
            expect.objectContaining({
                depth: 6,
            }),
        );
    });

    it('should process CONTINUE event and execute specified step', async () => {
        mockOrchestrator.executeStep.mockImplementation(async () => ({
            status: 'SUCCESS',
        }));

        const event = {
            data: {
                autopilotId: 'auto-1',
                state: {
                    traceId: 'trace-1',
                    stepIndex: 2,
                    entityType: 'task',
                    entityId: '123',
                    depth: 0,
                },
            },
        };

        await (listener as any).onContinue([event]);

        expect(mockOrchestrator.executeStep).toHaveBeenCalledWith(
            'auto-1',
            expect.objectContaining({
                stepIndex: 2,
                traceId: 'trace-1',
            }),
        );
    });

    it('should emit CONTINUE event if executeStep returns nextIndex', async () => {
        mockOrchestrator.executeStep.mockResolvedValue({
            status: 'SUCCESS',
            nextIndex: 1,
        });

        const event = {
            data: {
                autopilotId: 'auto-1',
                state: {
                    traceId: 'trace-1',
                    stepIndex: 0,
                    entityType: 'task',
                    entityId: '123',
                    depth: 0,
                },
            },
        };

        await (listener as any).onContinue([event]);

        expect(appendEventsToOutbox).toHaveBeenCalledWith(
            expect.anything(),
            expect.arrayContaining([
                expect.objectContaining({
                    kafka_topic: KAFKA_TOPICS.AUTOPILOT,
                    payload: expect.objectContaining({
                        type: KAFKA_EVENTS.PIPELINE.CONTINUE,
                        data: expect.objectContaining({
                            autopilotId: 'auto-1',
                            state: expect.objectContaining({
                                stepIndex: 1,
                            }),
                        }),
                    }),
                }),
            ]),
        );
    });

    it('should not emit CONTINUE event if executeStep returns no nextIndex (completion)', async () => {
        mockOrchestrator.executeStep.mockResolvedValue({
            status: 'SUCCESS',
            nextIndex: undefined,
        });

        const event = {
            data: {
                autopilotId: 'auto-1',
                state: {
                    traceId: 'trace-1',
                    stepIndex: 5,
                    entityType: 'task',
                    entityId: '123',
                    depth: 0,
                },
            },
        };

        await (listener as any).onContinue([event]);

        expect(appendEventsToOutbox).not.toHaveBeenCalled();
    });

    it('should handle HALTED status without continuing', async () => {
        mockOrchestrator.executeStep.mockResolvedValue({
            status: 'HALTED',
            reason: 'Condition failed',
        });

        const event = {
            data: {
                autopilotId: 'auto-1',
                state: {
                    traceId: 'trace-1',
                    stepIndex: 0,
                    entityType: 'task',
                    entityId: '123',
                    depth: 0,
                },
            },
        };

        await (listener as any).onContinue([event]);

        expect(appendEventsToOutbox).not.toHaveBeenCalled();
    });

    it('should handle errors in executeStep gracefully', async () => {
        mockOrchestrator.executeStep.mockImplementation(async () => {
            throw new Error('Execution failed');
        });

        const event = {
            data: {
                autopilotId: 'auto-1',
                state: {
                    traceId: 'trace-1',
                    stepIndex: 0,
                    entityType: 'task',
                    entityId: '123',
                    depth: 0,
                },
            },
        };

        // Should not throw, but log error internally
        await (listener as any).onContinue([event]);
    });
});
