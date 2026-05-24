import { db } from '../../../infra/database/index.ts';
import { ValidationError } from '../../../infra/graphql/errors.ts';
import type { Task, TaskService } from '../TaskService.ts';

export const AUTOMATION_TRIGGERS = [
    'TASK_STATUS_CHANGED',
    'PREREQUISITE_COMPLETED',
    'MEMBER_ASSIGNED',
] as const;

export const AUTOMATION_CONDITION_TYPES = [
    'IS_BLOCKED',
    'ALL_PREREQUISITES_DONE',
    'HAS_NO_ASSIGNEE',
    'TAG_CONTAINS',
] as const;

export const AUTOMATION_ACTION_TYPES = [
    'SET_STATUS',
    'SET_ASSIGNEE_TO_ACTOR',
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

const hasIncompletePrerequisites = async (task: Task): Promise<boolean> => {
    const blockers = await db
        .selectFrom('task_reachability')
        .innerJoin(
            'project_task',
            'project_task.id',
            'task_reachability.ancestor_task_id',
        )
        .select('project_task.id')
        .where('task_reachability.fk_project_id', '=', task.projectId)
        .where('task_reachability.descendant_task_id', '=', task.id)
        .where('project_task.status', '!=', 'DONE')
        .limit(1)
        .execute();

    return blockers.length > 0;
};

export const AUTOMATION_CONDITIONS = {
    IS_BLOCKED: async (task: Task) => hasIncompletePrerequisites(task),

    ALL_PREREQUISITES_DONE: async (task: Task) =>
        !(await hasIncompletePrerequisites(task)),

    HAS_NO_ASSIGNEE: async (task: Task) => !task.memberId,

    TAG_CONTAINS: async (_task: Task, _value: string | null) => false,
} satisfies Record<
    (typeof AUTOMATION_CONDITION_TYPES)[number],
    AutomationCondition
>;

export const AUTOMATION_ACTIONS = {
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

    SET_ASSIGNEE_TO_ACTOR: async (task: Task, _value: string | null, ctx) => {
        if (!ctx.taskService || task.memberId === ctx.actorId) return;

        await ctx.taskService.updateTask({
            actorId: ctx.actorId,
            projectId: task.projectId,
            taskId: task.id,
            version: task.version,
            memberId: ctx.actorId,
        });
    },

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
