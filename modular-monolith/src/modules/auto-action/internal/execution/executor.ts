import { logger } from '../../../../logger/index.js';
import type { PipelineStep } from '../../types.js';
import { executeAction } from '../engines/actionEngine.js';
import { evaluateConditionFromIndex } from '../engines/conditionEngine.js';
import { fetchContext } from '../engines/contextEngine.js';
import { selectAutoActionForExecution } from '../queries/AutoActionQueries.js';

/**
 * Cursor for resuming a step mid-execution.
 *
 * `conditionChildIndex` — when set to N > 0, condition evaluation begins from
 * child N of a top-level AND node, skipping already-evaluated children.
 * This supports condition splitting for very long condition trees and is the
 * primary extension point for future async/batch condition processing.
 */
export interface StepResumeCursor {
    conditionChildIndex?: number;
}

/**
 * Executes a single pipeline step (either Action or Condition-Action) against fresh context.
 * Accepts an optional `cursor` for resuming mid-step (e.g. condition splitting).
 * Returns true if an action was executed, false if it was skipped or not evaluated.
 */
export async function executeAutoActionStep(
    step: PipelineStep,
    scope: string,
    entityId: string,
    actorId: string,
    traceId: string,
    wasSnapshot?: Record<string, any>,
    cursor?: StepResumeCursor,
): Promise<boolean> {
    const context = await fetchContext(
        scope,
        entityId,
        actorId,
        traceId,
        wasSnapshot,
    );

    if (step.type === 'action') {
        await executeAction(step.actionId, context, step.inputs);
        return true;
    }

    if (step.type === 'condition_action') {
        const conditionChildIndex = cursor?.conditionChildIndex ?? 0;

        // Use evaluateConditionFromIndex to support condition splitting.
        // When conditionChildIndex === 0 this is equivalent to a full evaluation.
        const matched = evaluateConditionFromIndex(
            step.condition,
            context,
            conditionChildIndex,
        );

        if (matched) {
            await executeAction(step.actionId, context, step.inputs);
            return true;
        }
        return false;
    }

    return false;
}

/**
 * Sequential Pipeline Processor.
 * Loops sequentially through pipeline steps starting from `startIndex`.
 * Fetches fresh context at each step to ensure data consistency across multi-step mutations.
 *
 * @param maxSteps Limits how many steps to process in one execution run.
 *                 Enables "Resumable Pipelines": if completed is false, the caller
 *                 should re-emit a CONTINUE event to resume from lastProcessedIndex + 1.
 *
 * Returns completion status and last processed index to support suspendable flow execution.
 */
export async function executeAutoActionPipeline(
    autoActionId: string,
    entityId: string,
    actorId: string,
    traceId: string,
    wasSnapshot?: Record<string, any>,
    startIndex = 0,
    startCursor?: StepResumeCursor,
    maxSteps?: number,
): Promise<{ completed: boolean; lastProcessedIndex: number }> {
    const autoAction = await selectAutoActionForExecution(autoActionId);

    if (!autoAction) {
        throw new Error(`Auto Action "${autoActionId}" not found.`);
    }

    if (!autoAction.is_active) {
        logger.info(
            `Auto Action "${autoActionId}" is inactive. Skipping execution.`,
        );
        return { completed: false, lastProcessedIndex: startIndex - 1 };
    }

    const rawSteps = autoAction.steps;
    const steps = (
        typeof rawSteps === 'string' ? JSON.parse(rawSteps) : rawSteps
    ) as PipelineStep[];

    if (!steps || steps.length === 0) {
        return { completed: true, lastProcessedIndex: -1 };
    }

    const scope = 'TASK'; // Default scope
    let lastProcessedIndex = startIndex - 1;
    let stepsProcessed = 0;

    for (let i = startIndex; i < steps.length; i++) {
        // CHUNKING LOGIC (RES-02):
        // If we exceed the maxSteps limit, stop execution and return current state.
        // This prevents long-running synchronous requests or Kafka consumer timeouts.
        if (maxSteps !== undefined && stepsProcessed >= maxSteps) {
            return { completed: false, lastProcessedIndex };
        }

        const step = steps[i]!;
        // The startCursor applies only to the first step we execute in this run.
        // After that, every step starts fresh from the beginning of its condition.
        const cursor = i === startIndex ? startCursor : undefined;
        await executeAutoActionStep(
            step,
            scope,
            entityId,
            actorId,
            traceId,
            wasSnapshot,
            cursor,
        );
        lastProcessedIndex = i;
        stepsProcessed++;
    }

    return { completed: true, lastProcessedIndex };
}
