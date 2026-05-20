import type { ConditionDefinition } from '../../types.js';
import { EntityScope } from '../../types.js';
import type { TaskContext } from './types.js';
import {
    taskFieldChangedFromSchema,
    taskFieldChangedFromToSchema,
    taskFieldChangedSchema,
    taskFieldChangedToSchema,
    taskMemberAssignedSchema,
    taskMemberChangedSchema,
    taskMemberUnassignedSchema,
    taskTeamAssignedSchema,
    taskTeamChangedSchema,
    taskTeamUnassignedSchema,
} from './types.js';

/**
 * Resolves current and previous values for standard task fields.
 */
export function getTaskFieldValues(
    field: 'status' | 'priority' | 'title' | 'version',
    ctx: TaskContext,
): { currentValue: any; prevValue: any } {
    let prevKey: keyof TaskContext;
    let currentKey: keyof TaskContext;

    switch (field) {
        case 'status':
            prevKey = 'prev_status';
            currentKey = 'current_status';
            break;
        case 'priority':
            prevKey = 'prev_priority';
            currentKey = 'current_priority';
            break;
        case 'title':
            prevKey = 'prev_title';
            currentKey = 'current_title';
            break;
        case 'version':
            prevKey = 'prev_version';
            currentKey = 'current_version';
            break;
    }

    return {
        currentValue: ctx[currentKey],
        prevValue: ctx[prevKey],
    };
}

/**
 * Transition-focused condition predicate definitions for the TASK scope.
 */

export const TaskFieldChangedCondition: ConditionDefinition<
    typeof taskFieldChangedSchema
> = {
    type: 'TaskFieldChanged',
    name: 'Task Field Changed',
    description: 'Triggers when a specific standard task field changes value.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskFieldChangedSchema,
    evaluate(ctx: TaskContext, node) {
        const { currentValue, prevValue } = getTaskFieldValues(node.field, ctx);
        return prevValue !== currentValue;
    },
};

export const TaskFieldChangedToCondition: ConditionDefinition<
    typeof taskFieldChangedToSchema
> = {
    type: 'TaskFieldChangedTo',
    name: 'Task Field Changed To',
    description:
        'Triggers when a specific standard task field changes to a targeted value.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskFieldChangedToSchema,
    evaluate(ctx: TaskContext, node) {
        const { currentValue, prevValue } = getTaskFieldValues(node.field, ctx);
        return currentValue === node.to && prevValue !== node.to;
    },
};

export const TaskFieldChangedFromCondition: ConditionDefinition<
    typeof taskFieldChangedFromSchema
> = {
    type: 'TaskFieldChangedFrom',
    name: 'Task Field Changed From',
    description:
        'Triggers when a specific standard task field changes away from a targeted value.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskFieldChangedFromSchema,
    evaluate(ctx: TaskContext, node) {
        const { currentValue, prevValue } = getTaskFieldValues(node.field, ctx);
        return prevValue === node.from && currentValue !== node.from;
    },
};

export const TaskFieldChangedFromToCondition: ConditionDefinition<
    typeof taskFieldChangedFromToSchema
> = {
    type: 'TaskFieldChangedFromTo',
    name: 'Task Field Changed From To',
    description:
        'Triggers when a specific standard task field changes from a targeted value to another targeted value.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskFieldChangedFromToSchema,
    evaluate(ctx: TaskContext, node) {
        const { currentValue, prevValue } = getTaskFieldValues(node.field, ctx);
        return prevValue === node.from && currentValue === node.to;
    },
};

export const TaskTeamChangedCondition: ConditionDefinition<
    typeof taskTeamChangedSchema
> = {
    type: 'TaskTeamChanged',
    name: 'Task Team Changed',
    description: 'Triggers when the team assigned to the task changes.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskTeamChangedSchema,
    evaluate(ctx: TaskContext) {
        return ctx.prev_team_id !== ctx.current_team_id;
    },
};

export const TaskTeamAssignedCondition: ConditionDefinition<
    typeof taskTeamAssignedSchema
> = {
    type: 'TaskTeamAssigned',
    name: 'Task Team Assigned',
    description: 'Triggers when a team is assigned to the task.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskTeamAssignedSchema,
    evaluate(ctx: TaskContext, node) {
        if (node.teamId !== undefined) {
            return (
                ctx.current_team_id === node.teamId &&
                ctx.prev_team_id !== node.teamId
            );
        }
        return (
            ctx.current_team_id !== null &&
            ctx.current_team_id !== undefined &&
            ctx.prev_team_id === null
        );
    },
};

export const TaskTeamUnassignedCondition: ConditionDefinition<
    typeof taskTeamUnassignedSchema
> = {
    type: 'TaskTeamUnassigned',
    name: 'Task Team Unassigned',
    description: 'Triggers when a team is unassigned from the task.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskTeamUnassignedSchema,
    evaluate(ctx: TaskContext) {
        return (
            ctx.prev_team_id !== null &&
            ctx.prev_team_id !== undefined &&
            (ctx.current_team_id === null || ctx.current_team_id === undefined)
        );
    },
};

export const TaskMemberChangedCondition: ConditionDefinition<
    typeof taskMemberChangedSchema
> = {
    type: 'TaskMemberChanged',
    name: 'Task Member Changed',
    description: 'Triggers when the member assigned to the task changes.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskMemberChangedSchema,
    evaluate(ctx: TaskContext) {
        return ctx.prev_member_id !== ctx.current_member_id;
    },
};

export const TaskMemberAssignedCondition: ConditionDefinition<
    typeof taskMemberAssignedSchema
> = {
    type: 'TaskMemberAssigned',
    name: 'Task Member Assigned',
    description: 'Triggers when a member is assigned to the task.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskMemberAssignedSchema,
    evaluate(ctx: TaskContext, node) {
        if (node.memberId !== undefined) {
            return (
                ctx.current_member_id === node.memberId &&
                ctx.prev_member_id !== node.memberId
            );
        }
        return (
            ctx.current_member_id !== null &&
            ctx.current_member_id !== undefined &&
            ctx.prev_member_id === null
        );
    },
};

export const TaskMemberUnassignedCondition: ConditionDefinition<
    typeof taskMemberUnassignedSchema
> = {
    type: 'TaskMemberUnassigned',
    name: 'Task Member Unassigned',
    description: 'Triggers when a member is unassigned from the task.',
    isAsync: false,
    scope: EntityScope.TASK,
    schema: taskMemberUnassignedSchema,
    evaluate(ctx: TaskContext) {
        return (
            ctx.prev_member_id !== null &&
            ctx.prev_member_id !== undefined &&
            (ctx.current_member_id === null ||
                ctx.current_member_id === undefined)
        );
    },
};

/**
 * Unified list of all task-scoped condition definitions.
 */
export const taskConditions: ConditionDefinition<any>[] = [
    TaskFieldChangedCondition,
    TaskFieldChangedToCondition,
    TaskFieldChangedFromCondition,
    TaskFieldChangedFromToCondition,
    TaskTeamChangedCondition,
    TaskTeamAssignedCondition,
    TaskTeamUnassignedCondition,
    TaskMemberChangedCondition,
    TaskMemberAssignedCondition,
    TaskMemberUnassignedCondition,
];
