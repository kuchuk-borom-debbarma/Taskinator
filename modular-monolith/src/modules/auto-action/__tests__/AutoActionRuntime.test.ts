import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { db } from '../../../database/index.js';
import type { AutoAction } from '../../../database/tables/AutoAction.js';
import type { DomainEvent } from '../../../utils/event-bus';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../utils/event-bus/constants.ts';

const loggerMock = {
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
};

const subscribeMock = mock(async () => {});
const handleTaskEventsMock = mock(async () => {});
const executeQueryMock = mock(
    async (): Promise<{ rows: AutoAction[] }> => ({
        rows: [],
    }),
);
const executePipelineMock = mock(async () => ({
    completed: true,
    lastProcessedIndex: 0,
}));

mock.module(import.meta.resolve('../../../logger/index.ts'), () => ({
    logger: loggerMock,
}));

mock.module(import.meta.resolve('../../../utils/EventBus.ts'), () => ({
    default: {
        subscribe: subscribeMock,
    },
}));

const { AutoActionTaskEventConsumer } = await import(
    '../internal/listeners/AutoActionTaskEventConsumer.ts'
);
const { autoActionService } = await import('../index.ts');
const { AutoActionServiceImpl } = await import(
    '../internal/service/AutoActionServiceImpl.ts'
);

const originalHandleTaskEvents = autoActionService.handleTaskEvents;
const originalExecuteQuery = db.getExecutor().executeQuery;

function createEvent(type: string, data: Record<string, any>): DomainEvent {
    return {
        eventId: `evt-${type}`,
        type,
        key: data.projectId ?? null,
        data,
        timestamp: new Date().toISOString(),
    };
}

function createAutoAction(overrides: Partial<AutoAction> = {}): AutoAction {
    return {
        id: 'auto-action-1',
        fk_project_id: 'project-1',
        name: 'Move task',
        description: null,
        triggers: [{ type: KAFKA_EVENTS.TASK.UPDATED, scope: 'TASK' }],
        steps: [],
        is_active: true,
        is_sync: true,
        version: 1,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1',
        updated_by: 'user-1',
        ...overrides,
    };
}

describe('AutoAction runtime wiring', () => {
    beforeEach(() => {
        subscribeMock.mockClear();
        handleTaskEventsMock.mockClear();
        executeQueryMock.mockClear();
        executePipelineMock.mockClear();
        autoActionService.handleTaskEvents = handleTaskEventsMock;
        db.getExecutor().executeQuery = executeQueryMock as any;
    });

    afterEach(() => {
        autoActionService.handleTaskEvents = originalHandleTaskEvents;
        db.getExecutor().executeQuery = originalExecuteQuery;
    });

    it('subscribes to task events and delegates batches to the service', async () => {
        const consumer = new AutoActionTaskEventConsumer();

        await consumer.init();

        expect(subscribeMock).toHaveBeenCalledWith(
            KAFKA_TOPICS.TASK,
            'auto-action-task-trigger-group',
            expect.objectContaining({
                [KAFKA_EVENTS.TASK.CREATED]: expect.any(Function),
                [KAFKA_EVENTS.TASK.UPDATED]: expect.any(Function),
            }),
            { batch: true },
        );

        const subscribeCall = subscribeMock.mock.calls[0] as unknown as [
            string,
            string,
            Record<string, (events: DomainEvent[]) => Promise<void>>,
            { batch: boolean },
        ];
        const handlers = subscribeCall[2];
        const events = [
            createEvent(KAFKA_EVENTS.TASK.UPDATED, {
                projectId: 'project-1',
                taskId: 'task-1',
            }),
        ];

        await handlers[KAFKA_EVENTS.TASK.UPDATED]!(events);

        expect(handleTaskEventsMock).toHaveBeenCalledWith(events);
    });

    it('selects active matching rules and executes pipelines for task events', async () => {
        const service = new AutoActionServiceImpl();
        service.executePipeline = executePipelineMock as any;
        const event = createEvent(KAFKA_EVENTS.TASK.UPDATED, {
            projectId: 'project-1',
            taskId: 'task-1',
            actorId: 'user-1',
            traceId: 'trace-1',
            old: { status: 'TODO' },
        });

        // Mock queries:
        // 1. isEventProcessed -> returns false
        // 2. selectActiveAutoActionsForProject -> returns rules
        // 3. markEventProcessed -> (insert)
        executeQueryMock.mockResolvedValueOnce({ rows: [] }); // not processed
        executeQueryMock.mockResolvedValueOnce({
            rows: [
                createAutoAction({ is_sync: false }), // ASYNC ACTION
            ],
        });
        executeQueryMock.mockResolvedValueOnce({ rows: [] }); // insert processed_event

        await service.handleTaskEvents([event]);

        // Called for idempotency check and rule selection
        expect(executeQueryMock).toHaveBeenCalledTimes(3);
        expect(executePipelineMock).toHaveBeenCalledTimes(1);
        expect(executePipelineMock).toHaveBeenCalledWith(
            'auto-action-1',
            'task-1',
            'user-1',
            'trace-1',
            { status: 'TODO' },
            0,
            undefined,
            5, // async limit
        );
    });

    it('selects and executes sync-only matching rules for sync task events', async () => {
        const service = new AutoActionServiceImpl();
        service.executePipeline = executePipelineMock as any;
        const event = createEvent(KAFKA_EVENTS.TASK.UPDATED, {
            projectId: 'project-1',
            taskId: 'task-1',
            actorId: 'user-1',
            traceId: 'trace-1',
            old: { status: 'TODO' },
        });

        // handleSyncTaskEvents does NOT check idempotency (it's in the req lifecycle)
        // 1. selectActiveAutoActionsForProject -> returns rules
        executeQueryMock.mockResolvedValueOnce({
            rows: [
                createAutoAction({ id: 'sync-action-1', is_sync: true }),
                createAutoAction({ id: 'async-action-2', is_sync: false }),
            ],
        });

        await service.handleSyncTaskEvents(event);

        expect(executeQueryMock).toHaveBeenCalledTimes(1);
        expect(executePipelineMock).toHaveBeenCalledTimes(1);
        expect(executePipelineMock).toHaveBeenCalledWith(
            'sync-action-1',
            'task-1',
            'user-1',
            'trace-1',
            { status: 'TODO' },
            0,
            undefined,
            10, // sync limit
        );
    });

    it('skips unsupported and malformed task events', async () => {
        const service = new AutoActionServiceImpl();
        service.executePipeline = executePipelineMock as any;

        await service.handleTaskEvents([
            createEvent(KAFKA_EVENTS.TASK.DELETED, {
                projectId: 'project-1',
                taskId: 'task-1',
            }),
            createEvent(KAFKA_EVENTS.TASK.UPDATED, {
                projectId: 'project-1',
            }),
        ]);

        expect(executeQueryMock).not.toHaveBeenCalled();
        expect(executePipelineMock).not.toHaveBeenCalled();
    });
});
