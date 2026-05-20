import { z } from 'zod';

/**
 * Supported Entity Scopes for Automations.
 * Currently restricted strictly to TASK scope.
 */
export enum EntityScope {
    TASK = 'TASK',
}

/**
 * Zod Schema representing the lightweight, ID-based context for TASK scope events.
 * It contains essential keys and state deltas (prev_ and current_ fields) captured at trigger time.
 */
export const taskContextSchema = z.object({
    traceId: z.string(),
    scope: z.literal(EntityScope.TASK),
    actorId: z.string(),

    // Core Entity IDs
    taskId: z.string(),
    projectId: z.string(),

    // Previous state properties (trigger-time snapshots)
    prev_status: z.string().nullable().optional(),
    prev_priority: z.number().nullable().optional(),
    prev_title: z.string().nullable().optional(),
    prev_team_id: z.string().nullable().optional(),
    prev_member_id: z.string().nullable().optional(),

    // Current state properties (trigger-time snapshots)
    current_status: z.string().nullable().optional(),
    current_priority: z.number().nullable().optional(),
    current_title: z.string().nullable().optional(),
    current_team_id: z.string().nullable().optional(),
    current_member_id: z.string().nullable().optional(),
});

export type TaskContext = z.infer<typeof taskContextSchema>;

/**
 * Definition metadata representing a trigger type within a specific scope.
 */
export interface TriggerDefinition {
    readonly id: string;
    readonly name: string;
    readonly scope: EntityScope;
}

/**
 * Blueprint definition representing a reusable automation action.
 * Decouples static action metadata and validation from runtime execution.
 */
export interface ActionDefinition<I extends z.ZodObject<any>> {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly isAsync: boolean;
    readonly scope: EntityScope.TASK;
    readonly inputSchema: I;
    handler(ctx: TaskContext, inputs: z.infer<I>): Promise<unknown>;
}
