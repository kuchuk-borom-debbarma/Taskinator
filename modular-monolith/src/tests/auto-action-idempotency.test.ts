import { beforeEach, describe, expect, it, mock } from 'bun:test';
import * as Executor from '../modules/auto-action/internal/execution/executor.js';
import * as Queries from '../modules/auto-action/internal/queries/AutoActionQueries.js';
import { AutoActionServiceImpl } from '../modules/auto-action/internal/service/AutoActionServiceImpl';
import type { DomainEvent } from '../utils/event-bus';
import { KAFKA_EVENTS } from '../utils/event-bus/constants';

// Mock dependencies
mock.module(
    '../modules/auto-action/internal/queries/AutoActionQueries.js',
    () => ({
        ...Queries,
        selectActiveAutoActionsForProject: mock(),
    }),
);
mock.module('../modules/auto-action/internal/execution/executor.js', () => ({
    ...Executor,
    executeAutoActionPipeline: mock(),
}));
mock.module('../modules/project/index.js', () => ({
    projectService: { getProjectsByActorIdAndProjectIds: mock() },
}));

describe('AutoAction Idempotency', () => {
    let service: AutoActionServiceImpl;

    beforeEach(() => {
        service = new AutoActionServiceImpl();
        mock.restore();
    });

    const createMockEvent = (id: string, taskId: string): DomainEvent => ({
        eventId: id,
        type: KAFKA_EVENTS.TASK.CREATED,
        key: taskId,
        data: { projectId: 'p1', taskId, traceId: `trace-${id}` },
        timestamp: new Date().toISOString(),
    });

    it('should process distinct events', async () => {
        const events: DomainEvent[] = [
            createMockEvent('evt-1', 't1'),
            createMockEvent('evt-2', 't2'),
        ];

        (Queries.selectActiveAutoActionsForProject as any).mockResolvedValue([
            { id: 'aa-1', triggers: '["TASK_CREATED"]' },
        ]);

        await service.handleTaskEvents(events);

        expect(Executor.executeAutoActionPipeline).toHaveBeenCalledTimes(2);
    });

    it('should NOT process duplicate events (idempotency)', async () => {
        const events: DomainEvent[] = [
            createMockEvent('evt-1', 't1'),
            createMockEvent('evt-1', 't1'), // Duplicate ID
        ];

        (Queries.selectActiveAutoActionsForProject as any).mockResolvedValue([
            { id: 'aa-1', triggers: '["TASK_CREATED"]' },
        ]);

        await service.handleTaskEvents(events);

        // This is expected to fail (call count will be 2) until idempotency is implemented
        expect(Executor.executeAutoActionPipeline).toHaveBeenCalledTimes(1);
    });
});
