import { z } from 'zod';

/**
 * Zod Schema representing the lightweight, ID-based context for TASK scope events.
 */
export const taskContextSchema = z.object({
    traceId: z.string(),
    scope: z.literal('TASK'),
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
    prev_version: z.number().nullable().optional(),

    // Current state properties (trigger-time snapshots)
    current_status: z.string().nullable().optional(),
    current_priority: z.number().nullable().optional(),
    current_title: z.string().nullable().optional(),
    current_team_id: z.string().nullable().optional(),
    current_member_id: z.string().nullable().optional(),
    current_version: z.number().nullable().optional(),
});

export type TaskContext = z.infer<typeof taskContextSchema>;

/**
 * Standalone schemas for individual task condition predicates.
 */
export const taskFieldChangedSchema = z.object({
    type: z.literal('TaskFieldChanged'),
    field: z.enum(['status', 'priority', 'title', 'version']),
});

export const taskFieldChangedToSchema = z.object({
    type: z.literal('TaskFieldChangedTo'),
    field: z.enum(['status', 'priority', 'title', 'version']),
    to: z.union([z.string(), z.number()]),
});

export const taskFieldChangedFromSchema = z.object({
    type: z.literal('TaskFieldChangedFrom'),
    field: z.enum(['status', 'priority', 'title', 'version']),
    from: z.union([z.string(), z.number()]),
});

export const taskFieldChangedFromToSchema = z.object({
    type: z.literal('TaskFieldChangedFromTo'),
    field: z.enum(['status', 'priority', 'title', 'version']),
    from: z.union([z.string(), z.number()]),
    to: z.union([z.string(), z.number()]),
});

export const taskTeamChangedSchema = z.object({
    type: z.literal('TaskTeamChanged'),
});

export const taskTeamAssignedSchema = z.object({
    type: z.literal('TaskTeamAssigned'),
    teamId: z.string().optional(),
});

export const taskTeamUnassignedSchema = z.object({
    type: z.literal('TaskTeamUnassigned'),
});

export const taskMemberChangedSchema = z.object({
    type: z.literal('TaskMemberChanged'),
});

export const taskMemberAssignedSchema = z.object({
    type: z.literal('TaskMemberAssigned'),
    memberId: z.string().optional(),
});

export const taskMemberUnassignedSchema = z.object({
    type: z.literal('TaskMemberUnassigned'),
});

/**
 * Task-specific condition predicate nodes.
 * Contains only hardcoded, transition-focused checks.
 */
export const taskPredicateNodeSchema = z.discriminatedUnion('type', [
    taskFieldChangedSchema,
    taskFieldChangedToSchema,
    taskFieldChangedFromSchema,
    taskFieldChangedFromToSchema,
    taskTeamChangedSchema,
    taskTeamAssignedSchema,
    taskTeamUnassignedSchema,
    taskMemberChangedSchema,
    taskMemberAssignedSchema,
    taskMemberUnassignedSchema,
]);

export type TaskPredicateNode = z.infer<typeof taskPredicateNodeSchema>;
