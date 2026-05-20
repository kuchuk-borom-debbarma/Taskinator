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
 * Definition metadata representing a trigger type.
 */
export interface TriggerDefinition {
    readonly id: string;
    readonly name: string;
    readonly scope: EntityScope;
}

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
