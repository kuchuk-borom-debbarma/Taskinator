/**
 * @file PipelineOrchestrator.ts
 * @description Core execution engine for Autopilot pipelines.
 * Orchestrates sequential execution of conditions and actions with strict halt semantics.
 *
 * @mandate PIPE-01, PIPE-02, PIPE-03
 */

import type { ActionExecutor } from '../action-engine/ActionExecutor.js';
import type { ActionRepository } from '../action-engine/ActionRepository.js';
import type { AsyncResolverRegistry } from '../action-engine/AsyncResolverRegistry.js';
import { ContextualEntity } from '../action-engine/ContextualEntity.js';
import { evaluateCondition } from '../condition-engine/ConditionEvaluator.js';
import type { ConditionRepository } from '../condition-engine/ConditionRepository.js';
import type {
    ContextBuilder,
    EntityType,
} from '../condition-engine/ContextBuilder.js';
import type { AutopilotQueryService } from '../internal/AutopilotQueryService.js';
import type {
    ExecutionState,
    PipelineExecutionResult,
    PipelineStep,
    StepResult,
} from './types.js';

/**
 * Orchestrates the execution of Autopilot pipelines.
 */
export class PipelineOrchestrator {
    constructor(
        private readonly autopilotQueryService: AutopilotQueryService,
        private readonly conditionRepository: ConditionRepository,
        private readonly actionRepository: ActionRepository,
        private readonly actionExecutor: ActionExecutor,
        private readonly contextBuilder: ContextBuilder,
        private readonly resolverRegistry: AsyncResolverRegistry,
    ) {}

    /**
     * Executes an autopilot pipeline starting from the current state.
     * Processes steps sequentially until completion, halt, or error.
     *
     * @param autopilotId The ID of the autopilot to execute.
     * @param state The current execution state.
     * @returns A promise resolving to the final execution result.
     */
    public async executePipeline(
        autopilotId: string,
        state: ExecutionState,
    ): Promise<PipelineExecutionResult> {
        // 1. Check loop safety (Task 3)
        this.checkLoopSafety(state);

        // 2. Fetch autopilot steps
        const autopilot =
            await this.autopilotQueryService.getAutopilotById(autopilotId);
        if (!autopilot) {
            return {
                status: 'ERROR',
                finalState: state,
                message: `Autopilot ${autopilotId} not found`,
            };
        }

        const steps = (autopilot.steps as unknown as PipelineStep[]) || [];

        // 3. Sequential Execution Loop
        let currentState = { ...state };

        while (currentState.stepIndex < steps.length) {
            const stepResult = await this.executeStep(
                autopilotId,
                currentState,
                steps,
            );

            if (stepResult.status === 'HALTED') {
                return {
                    status: 'HALTED',
                    finalState: currentState,
                    message: stepResult.reason,
                };
            }

            if (stepResult.status === 'ERROR') {
                return {
                    status: 'ERROR',
                    finalState: currentState,
                    message: stepResult.reason,
                };
            }

            // Move to next step
            currentState = {
                ...currentState,
                stepIndex: stepResult.nextIndex ?? currentState.stepIndex + 1,
            };
        }

        return {
            status: 'COMPLETED',
            finalState: currentState,
        };
    }

    /**
     * Executes a single step in the pipeline.
     */
    public async executeStep(
        autopilotId: string,
        state: ExecutionState,
        steps?: PipelineStep[],
    ): Promise<StepResult> {
        // 1. Check loop safety
        try {
            this.checkLoopSafety(state);
        } catch (error: any) {
            return { status: 'ERROR', reason: error.message };
        }

        const resolvedSteps = steps ?? (await this.fetchSteps(autopilotId));
        if (!resolvedSteps) {
            return {
                status: 'ERROR',
                reason: `Autopilot ${autopilotId} not found or has no steps`,
            };
        }

        const step = resolvedSteps[state.stepIndex];
        if (!step) {
            return { status: 'ERROR', reason: 'Step index out of bounds' };
        }

        if (step.type === 'condition') {
            const conditionResult = await this.handleConditionStep(step, state);
            if (conditionResult.status !== 'SUCCESS') {
                return conditionResult;
            }
        } else if (step.type === 'action') {
            const actionResult = await this.handleActionStep(step, state);
            if (actionResult.status !== 'SUCCESS') {
                return actionResult;
            }
        } else {
            return {
                status: 'ERROR',
                reason: `Unknown step type: ${step.type}`,
            };
        }

        const nextIndex = state.stepIndex + 1;
        return {
            status: 'SUCCESS',
            nextIndex: nextIndex < resolvedSteps.length ? nextIndex : undefined,
        };
    }

    private async fetchSteps(
        autopilotId: string,
    ): Promise<PipelineStep[] | null> {
        const autopilot =
            await this.autopilotQueryService.getAutopilotById(autopilotId);
        return autopilot
            ? (autopilot.steps as unknown as PipelineStep[])
            : null;
    }

    /**
     * Handles a condition step.
     * Halts if condition fails.
     */
    private async handleConditionStep(
        step: PipelineStep,
        state: ExecutionState,
    ): Promise<StepResult> {
        const ast = await this.conditionRepository.getConditionByHash(
            step.refId,
        );
        if (!ast) {
            return {
                status: 'ERROR',
                reason: `Condition ${step.refId} not found`,
            };
        }

        const context = await this.contextBuilder.buildContext(
            state.entityType as EntityType,
            state.entityId,
            state.snapshot || {},
        );

        const passed = evaluateCondition(ast, context);

        if (!passed) {
            return {
                status: 'HALTED',
                reason: `Condition ${step.refId} failed`,
            };
        }

        return { status: 'SUCCESS' };
    }

    /**
     * Handles an action step.
     */
    private async handleActionStep(
        step: PipelineStep,
        state: ExecutionState,
    ): Promise<StepResult> {
        const ast = await this.actionRepository.getActionByHash(step.refId);
        if (!ast) {
            return {
                status: 'ERROR',
                reason: `Action ${step.refId} not found`,
            };
        }

        // We need the triggering entity as a ContextualEntity
        const context = await this.contextBuilder.buildContext(
            state.entityType as EntityType,
            state.entityId,
            state.snapshot || {},
        );

        const selfEntity = new ContextualEntity(
            state.entityType,
            state.entityId,
            context.is,
            this.resolverRegistry,
        );

        const mutatedEntities = await this.actionExecutor.execute(
            ast,
            selfEntity,
        );

        return { status: 'SUCCESS', mutatedEntities };
    }

    /**
     * Implements loop safety checks.
     * (Task 3 Implementation)
     */
    private checkLoopSafety(state: ExecutionState): void {
        if (state.depth > 50) {
            throw new Error(
                `Loop detected: recursion depth ${state.depth} exceeds limit of 50`,
            );
        }
    }
}
