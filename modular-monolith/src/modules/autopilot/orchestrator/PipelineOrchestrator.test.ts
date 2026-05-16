import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ActionExecutor } from '../action-engine/ActionExecutor.js';
import type { ActionRepository } from '../action-engine/ActionRepository.js';
import type { AsyncResolverRegistry } from '../action-engine/AsyncResolverRegistry.js';
import type { ConditionRepository } from '../condition-engine/ConditionRepository.js';
import type { ContextBuilder } from '../condition-engine/ContextBuilder.js';
import type { AutopilotQueryService } from '../internal/AutopilotQueryService.js';
import { PipelineOrchestrator } from './PipelineOrchestrator.js';
import type { ExecutionState, PipelineStep } from './types.js';

describe('PipelineOrchestrator', () => {
    let orchestrator: PipelineOrchestrator;
    let mockAutopilotQueryService: jest.Mocked<AutopilotQueryService>;
    let mockConditionRepository: jest.Mocked<ConditionRepository>;
    let mockActionRepository: jest.Mocked<ActionRepository>;
    let mockActionExecutor: jest.Mocked<ActionExecutor>;
    let mockContextBuilder: jest.Mocked<ContextBuilder>;
    let mockResolverRegistry: jest.Mocked<AsyncResolverRegistry>;

    beforeEach(() => {
        mockAutopilotQueryService = {
            getAutopilotById: jest.fn(),
        } as any;
        mockConditionRepository = {
            getConditionByHash: jest.fn(),
        } as any;
        mockActionRepository = {
            getActionByHash: jest.fn(),
        } as any;
        mockActionExecutor = {
            execute: jest.fn(),
        } as any;
        mockContextBuilder = {
            buildContext: jest.fn(),
        } as any;
        mockResolverRegistry = {} as any;

        orchestrator = new PipelineOrchestrator(
            mockAutopilotQueryService,
            mockConditionRepository,
            mockActionRepository,
            mockActionExecutor,
            mockContextBuilder,
            mockResolverRegistry,
        );
    });

    const defaultState: ExecutionState = {
        traceId: 'trace-1',
        entityType: 'project_task',
        entityId: 'task-1',
        depth: 0,
        stepIndex: 0,
        wasSnapshot: false,
    };

    it('should execute a simple 3-step pipeline (C-A-C) successfully', async () => {
        const steps: PipelineStep[] = [
            { type: 'condition', refId: 'cond-1' },
            { type: 'action', refId: 'act-1' },
            { type: 'condition', refId: 'cond-2' },
        ];

        mockAutopilotQueryService.getAutopilotById.mockResolvedValue({
            id: 'auto-1',
            steps: steps as any,
        } as any);

        mockConditionRepository.getConditionByHash.mockResolvedValue({
            field: 'status',
            operator: 'eq',
            value: 'TODO',
        } as any);

        mockActionRepository.getActionByHash.mockResolvedValue([] as any);

        mockContextBuilder.buildContext.mockResolvedValue({
            is: { status: 'TODO' },
            was: {},
        });

        mockActionExecutor.execute.mockResolvedValue([]);

        const result = await orchestrator.executePipeline(
            'auto-1',
            defaultState,
        );

        expect(result.status).toBe('COMPLETED');
        expect(result.finalState.stepIndex).toBe(3);
        expect(
            mockConditionRepository.getConditionByHash,
        ).toHaveBeenCalledTimes(2);
        expect(mockActionExecutor.execute).toHaveBeenCalledTimes(1);
    });

    it('should halt execution if a condition fails', async () => {
        const steps: PipelineStep[] = [
            { type: 'condition', refId: 'cond-1' },
            { type: 'action', refId: 'act-1' },
        ];

        mockAutopilotQueryService.getAutopilotById.mockResolvedValue({
            id: 'auto-1',
            steps: steps as any,
        } as any);

        mockConditionRepository.getConditionByHash.mockResolvedValue({
            field: 'status',
            operator: 'eq',
            value: 'DONE',
        } as any);

        mockContextBuilder.buildContext.mockResolvedValue({
            is: { status: 'TODO' },
            was: {},
        });

        const result = await orchestrator.executePipeline(
            'auto-1',
            defaultState,
        );

        expect(result.status).toBe('HALTED');
        expect(result.finalState.stepIndex).toBe(0);
        expect(mockActionExecutor.execute).not.toHaveBeenCalled();
    });

    it('should halt if recursion depth exceeds 50', async () => {
        const state: ExecutionState = { ...defaultState, depth: 51 };

        await expect(
            orchestrator.executePipeline('auto-1', state),
        ).rejects.toThrow(
            'Loop detected: recursion depth 51 exceeds limit of 50',
        );
    });

    it('should handle missing autopilot error', async () => {
        mockAutopilotQueryService.getAutopilotById.mockResolvedValue(null);

        const result = await orchestrator.executePipeline(
            'auto-1',
            defaultState,
        );

        expect(result.status).toBe('ERROR');
        expect(result.message).toContain('not found');
    });
});
