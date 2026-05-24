/**
 * AutomationRegistry
 *
 * Central registry for all automation Triggers, Conditions, and Actions.
 *
 * ─── How to extend ────────────────────────────────────────────────────────────
 *
 * Adding a Trigger:
 *   1. Append its string key to AUTOMATION_TRIGGERS.
 *   2. Wire it to an execution path (sync: TaskServiceImpl.runSyncAutomationRules,
 *      async: TaskAutomationListener).
 *   3. Add its template entry in the GraphQL resolver (task-automation.ts),
 *      including the compatibleConditions and compatibleActions lists.
 *
 * Adding a Condition:
 *   1. Append its string key to AUTOMATION_CONDITION_TYPES.
 *   2. Implement its callback in AUTOMATION_CONDITIONS below.
 *      Signature: (task: Task, value: string | null) => Promise<boolean>
 *   3. Add its template entry in the GraphQL resolver.
 *
 * Adding an Action:
 *   1. Append its string key to AUTOMATION_ACTION_TYPES.
 *   2. Implement its callback in AUTOMATION_ACTIONS below.
 *      Signature: (task: Task, value: string | null, ctx: AutomationActionContext) => Promise<void>
 *   3. Add its template entry in the GraphQL resolver.
 *
 * ─── Design rules ─────────────────────────────────────────────────────────────
 *
 * - No user-authored code. Keys select server-owned TypeScript callbacks only.
 * - Conditions must be read-only and deterministic.
 * - Actions that mutate state MUST go through ctx.taskService, never direct SQL.
 * - Sync-only actions MUST check ctx.isSync before throwing.
 * - Keep the registry finite and reviewable. Prefer expressive names over generic ones.
 *
 * See TCA_AUTOMATION.md for the full architecture reference.
 */

import { db } from '../../../infra/database/index.ts';
import { ValidationError } from '../../../infra/graphql/errors.ts';
import type { Task, TaskService } from '../TaskService.ts';

// ─── Trigger keys ─────────────────────────────────────────────────────────────

/**
 * Triggers define WHEN an automation rule starts evaluating.
 *
 * STATUS_CHANGED           — fires on the updated task whenever its status changes.
 * DESCENDANT_STATUS_CHANGED — fires on an ancestor task whenever any of its
 *                            descendants (direct or transitive) changes status.
 *                            The rule condition and action execute in the context
 *                            of the ancestor, not the changed descendant.
 */
export const AUTOMATION_TRIGGERS = [
    'STATUS_CHANGED',
    'DESCENDANT_STATUS_CHANGED',
    'LINKED_INCOMING_STATUS_CHANGED',
    'LINKED_OUTGOING_STATUS_CHANGED',
] as const;

// ─── Condition keys ───────────────────────────────────────────────────────────

/**
 * Conditions define the IF checks that must pass before an action runs.
 *
 * STATUS_EQUALS              — task's current status equals the supplied value.
 * ASSIGNEE_EQUALS            — task's assignee matches the supplied user ID
 *                              (or unassigned when value is 'none').
 * ALL_DESCENDANTS_IN_STATUS  — every descendant task (via task_reachability) is
 *                              in the supplied status. Vacuously true when the
 *                              task has no descendants.
 * HAS_INCOMPLETE_DESCENDANTS — at least one descendant is NOT in the supplied
 *                              status. Logical inverse of ALL_DESCENDANTS_IN_STATUS;
 *                              shares the same SQL query internally.
 */
export const AUTOMATION_CONDITION_TYPES = [
    'STATUS_EQUALS',
    'ASSIGNEE_EQUALS',
    'ALL_DESCENDANTS_IN_STATUS',
    'HAS_INCOMPLETE_DESCENDANTS',
    'ALL_LINKED_INCOMING_IN_STATUS',
    'ALL_LINKED_OUTGOING_IN_STATUS',
] as const;

// ─── Action keys ──────────────────────────────────────────────────────────────

/**
 * Actions define the THEN operations executed when trigger + condition match.
 *
 * SET_STATUS        — transitions the task to a specific status column.
 * SET_ASSIGNEE      — assigns the task to a member, the triggering actor, or unassigns it.
 * REJECT_TRANSITION — synchronously blocks the status change with a warning message.
 *                     Only valid in sync rules (is_sync = true).
 */
export const AUTOMATION_ACTION_TYPES = [
    'SET_STATUS',
    'SET_ASSIGNEE',
    'REJECT_TRANSITION',
] as const;

// ─── Type helpers ─────────────────────────────────────────────────────────────

type AutomationCondition = (
    task: Task,
    value: string | null,
) => Promise<boolean>;

export type AutomationActionContext = {
    actorId: string;
    /** true when running inside the synchronous pre-commit request path. */
    isSync?: boolean;
    /** Required for actions that call taskService.updateTask. */
    taskService?: TaskService;
};

type AutomationAction = (
    task: Task,
    value: string | null,
    ctx: AutomationActionContext,
) => Promise<void>;

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Returns true when EVERY descendant of `task` is in `status`.
 *
 * Queries the pre-computed task_reachability closure table, so this is a single
 * indexed lookup — no recursive CTE or graph traversal at query time.
 *
 * Vacuously true when the task has no descendants (nothing to be incomplete).
 */
async function allDescendantsInStatus(
    task: Task,
    status: string | null,
): Promise<boolean> {
    if (!status) return false; // No target status supplied — treat as not satisfied.

    // Look for the FIRST descendant whose status does not match.
    // Using LIMIT 1 is more efficient than COUNT(*) for an existence check.
    const firstMismatch = await db
        .selectFrom('task_reachability')
        .innerJoin(
            'project_task',
            'project_task.id',
            'task_reachability.descendant_task_id',
        )
        .select('task_reachability.descendant_task_id')
        .where('task_reachability.ancestor_task_id', '=', task.id)
        .where('task_reachability.depth', '>', 0)
        .where('project_task.status', '!=', status)
        .limit(1)
        .executeTakeFirst();

    return firstMismatch === undefined; // undefined → no mismatch → all in status
}

// ─── Condition registry ───────────────────────────────────────────────────────

export const AUTOMATION_CONDITIONS = {
    /**
     * True when the task's current status equals the user-supplied string.
     */
    STATUS_EQUALS: async (task: Task, value: string | null) =>
        task.status === value,

    /**
     * True when the task is assigned to the user-supplied ID.
     * Pass 'none' (or null/empty) to match unassigned tasks.
     */
    ASSIGNEE_EQUALS: async (task: Task, value: string | null) => {
        if (value === 'none' || value === null || value === '')
            return !task.memberId;
        return task.memberId === value;
    },

    /**
     * True when ALL descendants (direct and transitive) are in the supplied status.
     * Useful for parent-cascade rules: "promote parent once all children are done."
     *
     * Uses allDescendantsInStatus() — single DB lookup on task_reachability.
     */
    ALL_DESCENDANTS_IN_STATUS: async (task: Task, value: string | null) =>
        allDescendantsInStatus(task, value),

    /**
     * True when AT LEAST ONE descendant is NOT in the supplied status.
     * Logical inverse of ALL_DESCENDANTS_IN_STATUS — shares the same DB query.
     *
     * Useful for sync guard rules: "reject transition while children are unfinished."
     */
    HAS_INCOMPLETE_DESCENDANTS: async (task: Task, value: string | null) =>
        !(await allDescendantsInStatus(task, value)),

    /**
     * True when ALL tasks linking TO this task with label L are in status S.
     * Value format is JSON string: {"label": "blocks", "status": "DONE"}
     */
    ALL_LINKED_INCOMING_IN_STATUS: async (task: Task, value: string | null) => {
        if (!value) return false;
        try {
            const { label, status } = JSON.parse(value);
            if (!label || !status) return false;

            const firstMismatch = await db
                .selectFrom('task_link')
                .innerJoin(
                    'project_task',
                    'project_task.id',
                    'task_link.source_task_id',
                )
                .select('task_link.source_task_id')
                .where('task_link.target_task_id', '=', task.id)
                .where('task_link.label', '=', label)
                .where('project_task.status', '!=', status)
                .limit(1)
                .executeTakeFirst();

            return firstMismatch === undefined;
        } catch {
            return false;
        }
    },

    /**
     * True when ALL tasks this task links TO with label L are in status S.
     * Value format is JSON string: {"label": "blocks", "status": "DONE"}
     */
    ALL_LINKED_OUTGOING_IN_STATUS: async (task: Task, value: string | null) => {
        if (!value) return false;
        try {
            const { label, status } = JSON.parse(value);
            if (!label || !status) return false;

            const firstMismatch = await db
                .selectFrom('task_link')
                .innerJoin(
                    'project_task',
                    'project_task.id',
                    'task_link.target_task_id',
                )
                .select('task_link.target_task_id')
                .where('task_link.source_task_id', '=', task.id)
                .where('task_link.label', '=', label)
                .where('project_task.status', '!=', status)
                .limit(1)
                .executeTakeFirst();

            return firstMismatch === undefined;
        } catch {
            return false;
        }
    },
} satisfies Record<
    (typeof AUTOMATION_CONDITION_TYPES)[number],
    AutomationCondition
>;

// ─── Action registry ──────────────────────────────────────────────────────────

export const AUTOMATION_ACTIONS = {
    /**
     * Moves the task to the specified status column.
     * No-ops if the task is already in that status.
     */
    SET_STATUS: async (task: Task, value: string | null, ctx) => {
        if (!ctx.taskService || !value || task.status === value) return;

        await ctx.taskService.updateTask({
            actorId: ctx.actorId,
            projectId: task.projectId,
            taskId: task.id,
            version: task.version,
            status: value,
        });
    },

    /**
     * Assigns the task to a member.
     *   'actor' — assigns to the user who triggered the rule.
     *   'none'  — removes the current assignee.
     *   <id>    — assigns to that specific member ID.
     */
    SET_ASSIGNEE: async (task: Task, value: string | null, ctx) => {
        if (!ctx.taskService) return;

        const targetMemberId =
            value === 'none' || value === ''
                ? null
                : value === 'actor'
                  ? ctx.actorId
                  : value;

        if (task.memberId === targetMemberId) return; // already correct, skip write

        await ctx.taskService.updateTask({
            actorId: ctx.actorId,
            projectId: task.projectId,
            taskId: task.id,
            version: task.version,
            memberId: targetMemberId,
        });
    },

    /**
     * Synchronously rejects a status transition by throwing a ValidationError.
     * The error surfaces to the user as a visible warning message.
     *
     * Only fires when ctx.isSync is true — a no-op in async rules to prevent
     * accidental misuse of a sync-only action in an async context.
     */
    REJECT_TRANSITION: async (_task: Task, value: string | null, ctx) => {
        if (!ctx.isSync) return;

        throw new ValidationError(
            value || 'Transition blocked by automation policy.',
        );
    },
} satisfies Record<(typeof AUTOMATION_ACTION_TYPES)[number], AutomationAction>;

// ─── Type guard helpers ───────────────────────────────────────────────────────

export const isAutomationTrigger = (
    value: string,
): value is (typeof AUTOMATION_TRIGGERS)[number] =>
    AUTOMATION_TRIGGERS.includes(value as (typeof AUTOMATION_TRIGGERS)[number]);

export const isAutomationConditionType = (
    value: string,
): value is (typeof AUTOMATION_CONDITION_TYPES)[number] =>
    AUTOMATION_CONDITION_TYPES.includes(
        value as (typeof AUTOMATION_CONDITION_TYPES)[number],
    );

export const isAutomationActionType = (
    value: string,
): value is (typeof AUTOMATION_ACTION_TYPES)[number] =>
    AUTOMATION_ACTION_TYPES.includes(
        value as (typeof AUTOMATION_ACTION_TYPES)[number],
    );
