/**
 * @file types.ts
 * @description Type definitions for the Pipeline Orchestrator.
 * Defines steps, execution state, and results for sequential processing.
 *
 * @mandate PIPE-01, PIPE-02
 */

import type { ContextualEntity } from '../action-engine/ContextualEntity.js';

/**
 * A single step in an Autopilot pipeline.
 * Can be either a condition check or an action execution.
 */
export interface PipelineStep {
    /**
     * Type of step.
     * 'condition': Execution halts if condition fails.
     * 'action': Performs state mutations.
     */
    type: 'condition' | 'action';

    /**
     * Reference ID to the specific condition or action entity.
     * Used to fetch the AST from the repository.
     */
    refId: string;
}

/**
 * The current state of a pipeline execution.
 * Passed through the Kafka loop to allow resumability.
 */
export interface ExecutionState {
    /**
     * Unique trace ID for the entire execution chain.
     */
    traceId: string;

    /**
     * The type of entity that triggered this pipeline (e.g., 'project_task').
     */
    entityType: string;

    /**
     * The ID of the entity that triggered this pipeline.
     */
    entityId: string;

    /**
     * Current recursion depth.
     * Incremented on recursive triggers to prevent infinite loops.
     */
    depth: number;

    /**
     * Index of the current step being executed (0-indexed).
     */
    stepIndex: number;

    /**
     * Whether the current state is based on a point-in-time snapshot.
     */
    wasSnapshot: boolean;

    /**
     * Optional snapshot of the 'was' state at the time of the initial trigger.
     */
    snapshot?: Record<string, any>;
}

/**
 * Result of executing a single step.
 */
export interface StepResult {
    /**
     * Outcome of the step.
     * 'SUCCESS': Step completed and we can proceed.
     * 'HALTED': Execution stopped (condition failed or manual halt).
     * 'ERROR': Execution failed due to a system error.
     */
    status: 'SUCCESS' | 'HALTED' | 'ERROR';

    /**
     * Reason for halting or error, if applicable.
     */
    reason?: string;

    /**
     * The updated index for the next step.
     */
    nextIndex?: number;

    /**
     * Any entities modified by an action step.
     */
    mutatedEntities?: ContextualEntity[];
}

/**
 * Final result of a pipeline execution segment.
 */
export interface PipelineExecutionResult {
    /**
     * Overall status of the segment.
     */
    status: 'COMPLETED' | 'HALTED' | 'ERROR';

    /**
     * The final state after processing.
     */
    finalState: ExecutionState;

    /**
     * Optional message for debugging.
     */
    message?: string;
}
