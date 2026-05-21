import { z } from 'zod';
import {
    taskContextSchema,
    taskPredicateNodeSchema,
} from './scopes/task/types.js';

/**
 * Supported Entity Scopes for Automations.
 */
export enum EntityScope {
    TASK = 'TASK',
}

export type { TaskContext } from './scopes/task/types.js';
/**
 * Re-export scope-specific contexts for root convenience.
 */
export { taskContextSchema };

/**
 * Blueprint definition representing a reusable automation action.
 */
export interface ActionDefinition<I extends z.ZodObject<any>> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly isAsync: boolean;
    readonly scope: EntityScope;
    readonly inputSchema: I;
    handler(ctx: any, inputs: z.infer<I>): Promise<unknown>;
}

/**
 * Definition representing a registerable, transition-focused condition predicate.
 */
export interface ConditionDefinition<
    NodeSchema extends z.ZodObject<any> = z.ZodObject<any>,
> {
    readonly type: string;
    readonly name: string;
    readonly description?: string;
    readonly isAsync: boolean;
    readonly scope: EntityScope;
    readonly schema: NodeSchema;
    evaluate(ctx: any, node: z.infer<NodeSchema>): boolean;
}

/**
 * Supported logical operators for nesting condition evaluations.
 */
export const logicalOperatorSchema = z.enum(['AND', 'OR', 'NOT']);
export type LogicalOperator = z.infer<typeof logicalOperatorSchema>;

/**
 * Unified Predicate Node schema across all scopes.
 */
export const predicateNodeSchema = taskPredicateNodeSchema;
export type PredicateNode = z.infer<typeof predicateNodeSchema>;

/**
 * Recursive union type representing a unified Condition AST Node.
 */
export type ConditionNode =
    | {
          type: 'logical';
          operator: LogicalOperator;
          children: ConditionNode[];
      }
    | PredicateNode;

/**
 * Recursive Zod schema for validating the full Condition AST.
 */
export const conditionNodeSchema: z.ZodType<ConditionNode> = z.lazy(() =>
    z.discriminatedUnion('type', [
        z.object({
            type: z.literal('logical'),
            operator: logicalOperatorSchema,
            children: z.array(conditionNodeSchema),
        }),
        // Spread all options from our task discriminated union schema
        ...taskPredicateNodeSchema.options,
    ]),
);

/**
 * Specific typed interface representing logical branch nodes.
 */
export interface LogicalNode {
    type: 'logical';
    operator: LogicalOperator;
    children: ConditionNode[];
}

/**
 * Single action step within a pipeline.
 */
export const actionStepSchema = z.object({
    type: z.literal('action'),
    actionId: z.string(),
    inputs: z.any(),
});

/**
 * Conditional action step within a pipeline.
 */
export const conditionActionStepSchema = z.object({
    type: z.literal('condition_action'),
    condition: conditionNodeSchema,
    actionId: z.string(),
    inputs: z.any(),
});

/**
 * Unified schema for any step within an auto-action pipeline.
 */
export const pipelineStepSchema = z.discriminatedUnion('type', [
    actionStepSchema,
    conditionActionStepSchema,
]);

export type ActionStep = z.infer<typeof actionStepSchema>;
export type ConditionActionStep = z.infer<typeof conditionActionStepSchema>;
export type PipelineStep = z.infer<typeof pipelineStepSchema>;

/**
 * Schema for the full auto-action execution flow.
 */
export const autoActionFlowSchema = z.array(pipelineStepSchema);

export interface ActionTemplate {
    id: string;
    name: string;
    description: string;
    isAsync: boolean;
    scope: string;
    inputSchema: any;
}

export interface ConditionTemplate {
    type: string;
    name: string;
    description?: string;
    isAsync: boolean;
    scope: string;
    schema: any;
}

export interface ScopeTemplate {
    triggers: Array<{
        type: string;
        name: string;
        description: string;
        scope: string;
    }>;
    contextFields: string[];
    actions: ActionTemplate[];
    conditions: ConditionTemplate[];
}
