import { ValidationError } from '../../../infra/graphql/errors.ts';
import type { Task, TaskService } from '../TaskService.ts';

/**
 * Triggers define WHEN an automation rule starts evaluating.
 */
export const AUTOMATION_TRIGGERS = ['STATUS_CHANGED'] as const;

/**
 * Conditions define the IF checks that must pass to run the actions.
 */
export const AUTOMATION_CONDITION_TYPES = [
    'STATUS_EQUALS',
    'ASSIGNEE_EQUALS',
] as const;

/**
 * Actions define the THEN operations executed when a rule is triggered and conditions match.
 */
export const AUTOMATION_ACTION_TYPES = [
    'SET_STATUS',
    'SET_ASSIGNEE',
    'REJECT_TRANSITION',
] as const;

type AutomationCondition = (
    task: Task,
    value: string | null,
) => Promise<boolean>;

type AutomationActionContext = {
    actorId: string;
    isSync?: boolean;
    taskService?: TaskService;
};

type AutomationAction = (
    task: Task,
    value: string | null,
    ctx: AutomationActionContext,
) => Promise<void>;

/**
 * Registry of synchronous and asynchronous conditions.
 */
export const AUTOMATION_CONDITIONS = {
    /**
     * Checks if the task's current status matches the user-provided string.
     */
    STATUS_EQUALS: async (task: Task, value: string | null) =>
        task.status === value,

    /**
     * Checks if the task's current assignee matches the user-provided string (or is unassigned if 'none').
     */
    ASSIGNEE_EQUALS: async (task: Task, value: string | null) => {
        if (value === 'none' || value === null || value === '')
            return !task.memberId;
        return task.memberId === value;
    },
} satisfies Record<
    (typeof AUTOMATION_CONDITION_TYPES)[number],
    AutomationCondition
>;

/**
 * Registry of pre-commit validation actions and post-commit background tasks.
 */
export const AUTOMATION_ACTIONS = {
    /**
     * Moves the task to a specific status column.
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
     * Sets the task's assignee (assigns to the actor if 'actor', unassigns if 'none', or a specific member ID).
     */
    SET_ASSIGNEE: async (task: Task, value: string | null, ctx) => {
        if (!ctx.taskService) return;
        const targetAssignee =
            value === 'none' || value === ''
                ? null
                : value === 'actor'
                  ? ctx.actorId
                  : value;
        if (task.memberId === targetAssignee) return;

        await ctx.taskService.updateTask({
            actorId: ctx.actorId,
            projectId: task.projectId,
            taskId: task.id,
            version: task.version,
            memberId: targetAssignee,
        });
    },

    /**
     * Synchronously rejects a status transition with a custom warning message.
     */
    REJECT_TRANSITION: async (_task: Task, value: string | null, ctx) => {
        if (!ctx.isSync) return;

        throw new ValidationError(
            value || 'Transition blocked by automation policy.',
        );
    },
} satisfies Record<(typeof AUTOMATION_ACTION_TYPES)[number], AutomationAction>;

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
