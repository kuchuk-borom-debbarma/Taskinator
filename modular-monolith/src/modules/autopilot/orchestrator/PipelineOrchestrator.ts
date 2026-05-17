/**
 * @file PipelineOrchestrator.ts
 * @description Core execution engine for Autopilot pipelines.
 * Orchestrates sequential execution of conditions and actions with strict halt semantics.
 *
 * @mandate PIPE-01, PIPE-02, PIPE-03
 */

import { logger } from '../../../logger/index.js';
import type { ActionExecutor } from '../action-engine/ActionExecutor.js';
import type { ActionRepository } from '../action-engine/ActionRepository.js';
import type { AsyncResolverRegistry } from '../action-engine/AsyncResolverRegistry.js';
import { ContextualEntity } from '../action-engine/ContextualEntity.js';
import {
    evaluateCondition,
    toNaturalLanguage,
} from '../condition-engine/ConditionEvaluator.js';
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
        logger.info(
            `[PipelineOrchestrator] Starting execution of autopilot rule ${autopilotId} for ${state.entityType} ${state.entityId} (depth: ${state.depth}, traceId: ${state.traceId})`,
        );

        // 1. Check loop safety (Task 3)
        this.checkLoopSafety(state);

        // 2. Fetch autopilot steps
        const autopilot =
            await this.autopilotQueryService.getAutopilotById(autopilotId);
        if (!autopilot) {
            logger.error(
                `[PipelineOrchestrator] Autopilot rule ${autopilotId} not found`,
            );
            return {
                status: 'ERROR',
                finalState: state,
                message: `Autopilot ${autopilotId} not found`,
            };
        }

        const steps = (autopilot.steps as unknown as PipelineStep[]) || [];
        logger.info(
            `[PipelineOrchestrator] Loaded ${steps.length} sequential step(s) for autopilot rule ${autopilotId}`,
        );

        // 3. Sequential Execution Loop
        let currentState = { ...state };

        while (currentState.stepIndex < steps.length) {
            logger.info(
                `[PipelineOrchestrator] Executing step ${currentState.stepIndex + 1}/${steps.length} in autopilot rule ${autopilotId}`,
            );
            const stepResult = await this.executeStep(
                autopilotId,
                currentState,
                steps,
            );

            if (stepResult.status === 'HALTED') {
                logger.info(
                    `[PipelineOrchestrator] Autopilot rule ${autopilotId} halted at step ${currentState.stepIndex + 1} (reason: ${stepResult.reason})`,
                );
                return {
                    status: 'HALTED',
                    finalState: currentState,
                    message: stepResult.reason,
                };
            }

            if (stepResult.status === 'ERROR') {
                logger.error(
                    `[PipelineOrchestrator] Autopilot rule ${autopilotId} failed at step ${currentState.stepIndex + 1} (error: ${stepResult.reason})`,
                );
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

        logger.info(
            `[PipelineOrchestrator] Successfully completed all steps for autopilot rule ${autopilotId}`,
        );
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

        let mutatedEntities: ContextualEntity[] | undefined;

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
            mutatedEntities = actionResult.mutatedEntities;
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
            mutatedEntities,
        };
    }

    private async fetchSteps(
        autopilotId: string,
    ): Promise<PipelineStep[] | null> {
        const autopilot =
            await this.autopilotQueryService.getAutopilotById(autopilotId);
        return autopilot
            ? ((autopilot.steps as unknown as any[]) || []).map((step) => ({
                  ...step,
                  refId: step.refId ?? step.hash,
              }))
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
        logger.info(
            `[PipelineOrchestrator] [ConditionStep] Fetching condition definition for refId: ${step.refId}`,
        );
        const ast = await this.conditionRepository.getConditionByHash(
            step.refId,
        );
        if (!ast) {
            logger.error(
                `[PipelineOrchestrator] [ConditionStep] Condition definition with refId: ${step.refId} was not found`,
            );
            return {
                status: 'ERROR',
                reason: `Condition ${step.refId} not found`,
            };
        }

        logger.info(
            `[PipelineOrchestrator] [ConditionStep] Building runtime context for entity ${state.entityType} ${state.entityId}`,
        );
        const context = await this.contextBuilder.buildContext(
            state.entityType as EntityType,
            state.entityId,
            state.snapshot || {},
        );

        logger.info(
            `[PipelineOrchestrator] [ConditionStep] Evaluating AST condition for refId: ${step.refId} against context`,
        );
        const passed = evaluateCondition(ast, context);

        let conditionText = 'Unknown logic';
        try {
            conditionText = toNaturalLanguage(ast);
        } catch (e) {
            // Ignore NL generation errors
        }

        if (!passed) {
            logger.info(
                `[PipelineOrchestrator] [ConditionStep] Condition evaluation FAILED/HALTED for refId: ${step.refId} ("${conditionText}")`,
            );
            return {
                status: 'HALTED',
                reason: `Condition "${conditionText}" failed`,
            };
        }

        logger.info(
            `[PipelineOrchestrator] [ConditionStep] Condition evaluation PASSED for refId: ${step.refId} ("${conditionText}")`,
        );
        return { status: 'SUCCESS' };
    }

    /**
     * Handles an action step.
     */
    private async handleActionStep(
        step: PipelineStep,
        state: ExecutionState,
    ): Promise<StepResult> {
        logger.info(
            `[PipelineOrchestrator] [ActionStep] Fetching action definition for refId: ${step.refId}`,
        );
        const ast = await this.actionRepository.getActionByHash(step.refId);
        if (!ast) {
            logger.error(
                `[PipelineOrchestrator] [ActionStep] Action definition with refId: ${step.refId} was not found`,
            );
            return {
                status: 'ERROR',
                reason: `Action ${step.refId} not found`,
            };
        }

        logger.info(
            `[PipelineOrchestrator] [ActionStep] Preparing ContextualEntity and starting execution of action refId: ${step.refId}`,
        );
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

        logger.info(
            `[PipelineOrchestrator] [ActionStep] Successfully completed execution of action refId: ${step.refId}. Mutated ${mutatedEntities.length} entities: ` +
                `[${mutatedEntities.map((e) => `${e.type}:${e.id} (changes: ${JSON.stringify(e.getChanges())})`).join('; ')}]`,
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
