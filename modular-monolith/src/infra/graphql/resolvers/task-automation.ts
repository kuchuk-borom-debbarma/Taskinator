/**
 * task-automation resolver
 *
 * Serves two concerns:
 *
 * 1. Template Catalog  — a server-driven metadata object that tells the frontend
 *    what triggers, conditions, and actions exist, what inputs they need, and
 *    crucially: which conditions/actions are compatible with each trigger.
 *    The frontend uses this to filter the rule wizard without hardcoding anything.
 *
 * 2. Rule CRUD  — standard create / update / delete mutations delegated to
 *    taskService.
 *
 * ─── Adding new catalog entries ────────────────────────────────────────────────
 *
 * To add a new trigger:
 *   1. Add its key to TRIGGER_COMPATIBILITY below with the lists of conditions
 *      and actions that make sense for it.
 *   2. Add its template object to the `triggers` array in automationTemplatesCatalog.
 *
 * To add a new condition or action:
 *   1. Add its template object to the `conditions` or `actions` array.
 *   2. Reference its key in any TRIGGER_COMPATIBILITY entries where it applies.
 *
 * See TCA_AUTOMATION.md for the full architecture reference.
 */

import { taskService } from '../../../modules/task/index.ts';
import type { GraphQLContext } from '../context.ts';
import { UnauthorizedError } from '../errors.ts';

// ─── Compatibility map ────────────────────────────────────────────────────────

/**
 * Defines which conditions and actions are semantically valid for each trigger.
 *
 * This is the single source of truth for wizard step filtering.
 * The frontend receives these lists as part of each TriggerTemplate and uses
 * them to show only relevant options — no frontend-side hardcoding needed.
 *
 * Design rules:
 *   - REJECT_TRANSITION must only appear on sync-capable triggers (STATUS_CHANGED).
 *     DESCENDANT_STATUS_CHANGED is always async (the descendant already committed),
 *     so REJECT_TRANSITION is excluded.
 *   - HAS_INCOMPLETE_DESCENDANTS pairs with STATUS_CHANGED for sync guard rules.
 *   - ALL_DESCENDANTS_IN_STATUS pairs with DESCENDANT_STATUS_CHANGED for cascades.
 */
const TRIGGER_COMPATIBILITY: Record<
    string,
    { compatibleConditions: string[]; compatibleActions: string[] }
> = {
    STATUS_CHANGED: {
        compatibleConditions: [
            'STATUS_EQUALS',
            'ASSIGNEE_EQUALS',
            'HAS_INCOMPLETE_DESCENDANTS',
            'PRIORITY_COMPARISON',
            'TEAM_EQUALS',
            'ASSIGNEE_NOT_IN_TEAM',
            'HAS_LINK_WITH_LABEL',
        ],
        compatibleActions: [
            'SET_STATUS',
            'SET_ASSIGNEE',
            'REJECT_TRANSITION',
            'SET_PRIORITY',
            'SET_TEAM',
            'SET_TEAM_AND_ASSIGNEE',
            'AUTO_ASSIGN_CREATOR',
        ],
    },

    DESCENDANT_STATUS_CHANGED: {
        compatibleConditions: [
            'ALL_DESCENDANTS_IN_STATUS',
            'PRIORITY_COMPARISON',
            'TEAM_EQUALS',
        ],
        compatibleActions: [
            'SET_STATUS',
            'SET_ASSIGNEE',
            'SET_PRIORITY',
            'SET_TEAM',
            'SET_TEAM_AND_ASSIGNEE',
            'AUTO_ASSIGN_CREATOR',
        ],
    },

    LINKED_INCOMING_STATUS_CHANGED: {
        compatibleConditions: [
            'ALL_LINKED_INCOMING_IN_STATUS',
            'STATUS_EQUALS',
            'PRIORITY_COMPARISON',
            'TEAM_EQUALS',
        ],
        compatibleActions: [
            'SET_STATUS',
            'SET_ASSIGNEE',
            'SET_PRIORITY',
            'SET_TEAM_AND_ASSIGNEE',
            'AUTO_ASSIGN_CREATOR',
        ],
    },

    LINKED_OUTGOING_STATUS_CHANGED: {
        compatibleConditions: [
            'ALL_LINKED_OUTGOING_IN_STATUS',
            'STATUS_EQUALS',
            'PRIORITY_COMPARISON',
            'TEAM_EQUALS',
        ],
        compatibleActions: [
            'SET_STATUS',
            'SET_ASSIGNEE',
            'SET_PRIORITY',
            'SET_TEAM_AND_ASSIGNEE',
            'AUTO_ASSIGN_CREATOR',
        ],
    },

    PRIORITY_CHANGED: {
        compatibleConditions: [
            'STATUS_EQUALS',
            'ASSIGNEE_EQUALS',
            'PRIORITY_COMPARISON',
            'TEAM_EQUALS',
            'ASSIGNEE_NOT_IN_TEAM',
            'HAS_LINK_WITH_LABEL',
        ],
        compatibleActions: [
            'SET_STATUS',
            'SET_ASSIGNEE',
            'REJECT_TRANSITION',
            'SET_PRIORITY',
            'SET_TEAM',
            'SET_TEAM_AND_ASSIGNEE',
            'AUTO_ASSIGN_CREATOR',
        ],
    },

    ASSIGNEE_CHANGED: {
        compatibleConditions: [
            'STATUS_EQUALS',
            'ASSIGNEE_EQUALS',
            'PRIORITY_COMPARISON',
            'TEAM_EQUALS',
            'ASSIGNEE_NOT_IN_TEAM',
            'HAS_LINK_WITH_LABEL',
        ],
        compatibleActions: [
            'SET_STATUS',
            'SET_ASSIGNEE',
            'REJECT_TRANSITION',
            'SET_PRIORITY',
            'SET_TEAM',
            'SET_TEAM_AND_ASSIGNEE',
            'AUTO_ASSIGN_CREATOR',
        ],
    },

    TASK_CREATED: {
        compatibleConditions: [
            'STATUS_EQUALS',
            'ASSIGNEE_EQUALS',
            'PRIORITY_COMPARISON',
            'TEAM_EQUALS',
            'ASSIGNEE_NOT_IN_TEAM',
            'HAS_LINK_WITH_LABEL',
        ],
        compatibleActions: [
            'SET_STATUS',
            'SET_ASSIGNEE',
            'SET_PRIORITY',
            'SET_TEAM',
            'SET_TEAM_AND_ASSIGNEE',
            'AUTO_ASSIGN_CREATOR',
        ],
    },
};

// ─── Resolver ─────────────────────────────────────────────────────────────────

export const taskAutomationResolvers = {
    Query: {
        /**
         * Returns the full template catalog.
         *
         * The catalog is stateless and project-agnostic (all triggers/conditions/
         * actions are available to every project). It is safe to cache for the
         * lifetime of a user session.
         */
        automationTemplatesCatalog: async (
            _parent: unknown,
            { projectId: _projectId }: { projectId: string },
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            return {
                triggers: [
                    {
                        type: 'STATUS_CHANGED',
                        label: 'Task status changes',
                        description:
                            "Fires when a task's own status changes. " +
                            'Use this for sync guards (e.g. block the transition if children are unfinished) ' +
                            'or async cascades on the task itself.',
                        valueTemplate: {
                            inputType: 'COMPOSITE',
                            label: 'Status Transition',
                            fields: [
                                {
                                    key: 'from',
                                    inputType: 'SELECT',
                                    label: 'From Status (Optional)',
                                    dynamicOptionsSource: 'PROJECT_STATUSES',
                                },
                                {
                                    key: 'to',
                                    inputType: 'SELECT',
                                    label: 'To Status (Optional)',
                                    dynamicOptionsSource: 'PROJECT_STATUSES',
                                },
                            ],
                        },
                        supportedModes: ['SYNC', 'ASYNC'],
                        ...TRIGGER_COMPATIBILITY.STATUS_CHANGED,
                    },
                    {
                        type: 'DESCENDANT_STATUS_CHANGED',
                        label: 'A child / descendant task changes status',
                        description:
                            'Fires on the PARENT task when any child or grandchild changes status. ' +
                            'Use this for parent cascade rules — e.g. automatically set the parent ' +
                            'to READY once all descendants are DONE.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: 'Descendant status change',
                        },
                        supportedModes: ['ASYNC'],
                        ...TRIGGER_COMPATIBILITY.DESCENDANT_STATUS_CHANGED,
                    },
                    {
                        type: 'LINKED_INCOMING_STATUS_CHANGED',
                        label: 'A linked incoming task changes status',
                        description:
                            'Fires on this task when any task linking TO this task changes status. ' +
                            'E.g. fires on the parent when a subtask changes status.',
                        valueTemplate: {
                            inputType: 'TEXT',
                            label: 'Link Label (e.g. subtask_of, blocks)',
                            placeholder: 'blocks',
                        },
                        supportedModes: ['ASYNC'],
                        ...TRIGGER_COMPATIBILITY.LINKED_INCOMING_STATUS_CHANGED,
                    },
                    {
                        type: 'LINKED_OUTGOING_STATUS_CHANGED',
                        label: 'A linked outgoing task changes status',
                        description:
                            'Fires on this task when any task THIS task links TO changes status. ' +
                            'E.g. fires on the subtask when the parent changes status.',
                        valueTemplate: {
                            inputType: 'TEXT',
                            label: 'Link Label (e.g. subtask_of, blocks)',
                            placeholder: 'blocks',
                        },
                        supportedModes: ['ASYNC'],
                        ...TRIGGER_COMPATIBILITY.LINKED_OUTGOING_STATUS_CHANGED,
                    },
                    {
                        type: 'PRIORITY_CHANGED',
                        label: 'Task priority changes',
                        description:
                            "Fires when a task's priority is modified.",
                        valueTemplate: {
                            inputType: 'NONE',
                            label: 'Priority change',
                        },
                        supportedModes: ['SYNC', 'ASYNC'],
                        ...TRIGGER_COMPATIBILITY.PRIORITY_CHANGED,
                    },
                    {
                        type: 'ASSIGNEE_CHANGED',
                        label: 'Task assignee changes',
                        description:
                            "Fires when a task's individual assignee or team changes.",
                        valueTemplate: {
                            inputType: 'NONE',
                            label: 'Assignee change',
                        },
                        supportedModes: ['SYNC', 'ASYNC'],
                        ...TRIGGER_COMPATIBILITY.ASSIGNEE_CHANGED,
                    },
                    {
                        type: 'TASK_CREATED',
                        label: 'Task is created',
                        description:
                            'Fires when a new task is created inside the project.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: 'Task creation',
                        },
                        supportedModes: ['ASYNC'],
                        ...TRIGGER_COMPATIBILITY.TASK_CREATED,
                    },
                ],

                conditions: [
                    {
                        type: 'STATUS_EQUALS',
                        label: 'Task status is',
                        description:
                            'True when the task is currently in the selected status column.',
                        valueTemplate: {
                            inputType: 'SELECT',
                            label: 'Status',
                            dynamicOptionsSource: 'PROJECT_STATUSES',
                        },
                    },
                    {
                        type: 'ASSIGNEE_EQUALS',
                        label: 'Task assignee is',
                        description:
                            'True when the task is assigned to the selected team member.',
                        valueTemplate: {
                            inputType: 'TEAM_MEMBER',
                            label: 'Assigned member',
                        },
                    },
                    {
                        type: 'ALL_DESCENDANTS_IN_STATUS',
                        label: 'All descendants are in status',
                        description:
                            'True when every descendant task (direct children and deeper) ' +
                            'is in the selected status. Use with the parent-cascade trigger.',
                        valueTemplate: {
                            inputType: 'SELECT',
                            label: 'Target status',
                            dynamicOptionsSource: 'PROJECT_STATUSES',
                        },
                    },
                    {
                        type: 'HAS_INCOMPLETE_DESCENDANTS',
                        label: 'Has incomplete descendants',
                        description:
                            'True when at least one descendant task is NOT in the selected ' +
                            'status. Use with a sync rule to block transitions while children are unfinished.',
                        valueTemplate: {
                            inputType: 'SELECT',
                            label: 'Expected completion status',
                            dynamicOptionsSource: 'PROJECT_STATUSES',
                        },
                    },
                    {
                        type: 'ALL_LINKED_INCOMING_IN_STATUS',
                        label: 'All incoming linked tasks of type L are in status S',
                        description:
                            'True when every task with an incoming link of the specified label is in the selected status.',
                        valueTemplate: {
                            inputType: 'COMPOSITE',
                            label: 'Incoming Link Filter',
                            fields: [
                                {
                                    key: 'label',
                                    inputType: 'TEXT',
                                    label: 'Link Label (e.g. blocks, subtask)',
                                    placeholder: 'blocks',
                                },
                                {
                                    key: 'status',
                                    inputType: 'SELECT',
                                    label: 'Target Status',
                                    dynamicOptionsSource: 'PROJECT_STATUSES',
                                },
                            ],
                        },
                    },
                    {
                        type: 'ALL_LINKED_OUTGOING_IN_STATUS',
                        label: 'All outgoing linked tasks of type L are in status S',
                        description:
                            'True when every task with an outgoing link of the specified label is in the selected status.',
                        valueTemplate: {
                            inputType: 'COMPOSITE',
                            label: 'Outgoing Link Filter',
                            fields: [
                                {
                                    key: 'label',
                                    inputType: 'TEXT',
                                    label: 'Link Label (e.g. blocks, subtask)',
                                    placeholder: 'blocks',
                                },
                                {
                                    key: 'status',
                                    inputType: 'SELECT',
                                    label: 'Target Status',
                                    dynamicOptionsSource: 'PROJECT_STATUSES',
                                },
                            ],
                        },
                    },
                    {
                        type: 'PRIORITY_COMPARISON',
                        label: 'Task priority matches',
                        description:
                            'True when the task priority satisfies a dynamic operator comparison.',
                        valueTemplate: {
                            inputType: 'COMPOSITE',
                            label: 'Priority Comparison',
                            fields: [
                                {
                                    key: 'operator',
                                    inputType: 'SELECT',
                                    label: 'Operator',
                                    staticOptions: [
                                        { value: 'gt', label: 'Greater Than' },
                                        { value: 'lt', label: 'Less Than' },
                                        { value: 'eq', label: 'Equal To' },
                                        {
                                            value: 'gte',
                                            label: 'Greater Than or Equal',
                                        },
                                        {
                                            value: 'lte',
                                            label: 'Less Than or Equal',
                                        },
                                    ],
                                },
                                {
                                    key: 'value',
                                    inputType: 'NUMBER',
                                    label: 'Priority Value',
                                },
                            ],
                        },
                    },
                    {
                        type: 'ASSIGNEE_NOT_IN_TEAM',
                        label: 'Assignee is not in task team',
                        description:
                            'True when the individually assigned member does not belong to the task team.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: 'Assignee not in team check',
                        },
                    },
                    {
                        type: 'HAS_LINK_WITH_LABEL',
                        label: 'Task has a link of type L in direction D',
                        description:
                            'True when the task has a matching incoming or outgoing dependency link.',
                        valueTemplate: {
                            inputType: 'COMPOSITE',
                            label: 'Dependency Link Check',
                            fields: [
                                {
                                    key: 'direction',
                                    inputType: 'SELECT',
                                    label: 'Direction',
                                    staticOptions: [
                                        {
                                            value: 'incoming',
                                            label: 'Incoming Link',
                                        },
                                        {
                                            value: 'outgoing',
                                            label: 'Outgoing Link',
                                        },
                                        {
                                            value: 'both',
                                            label: 'Either Direction',
                                        },
                                    ],
                                },
                                {
                                    key: 'label',
                                    inputType: 'TEXT',
                                    label: 'Link Label (e.g. blocks, subtask)',
                                    placeholder: 'blocks',
                                },
                            ],
                        },
                    },
                ],

                actions: [
                    {
                        type: 'SET_STATUS',
                        label: 'Set task status to',
                        description:
                            'Automatically transitions the task to the selected status column.',
                        valueTemplate: {
                            inputType: 'SELECT',
                            label: 'Target status',
                            dynamicOptionsSource: 'PROJECT_STATUSES',
                        },
                        supportedModes: ['SYNC', 'ASYNC'],
                    },
                    {
                        type: 'SET_ASSIGNEE',
                        label: 'Set task assignee to',
                        description:
                            'Assigns the task to a team member, to the person who triggered ' +
                            'the rule, or removes the assignee entirely.',
                        valueTemplate: {
                            inputType: 'TEAM_MEMBER',
                            label: 'Assignee',
                        },
                        supportedModes: ['SYNC', 'ASYNC'],
                    },
                    {
                        type: 'REJECT_TRANSITION',
                        label: 'Block and warn user',
                        description:
                            'Synchronously rejects the status change and shows a warning ' +
                            'message to the user. Only valid in sync rules.',
                        valueTemplate: {
                            inputType: 'TEXT',
                            label: 'Warning message',
                            placeholder:
                                'e.g. Finish all subtasks before marking this done.',
                        },
                        supportedModes: ['SYNC'],
                    },
                    {
                        type: 'SET_PRIORITY',
                        label: 'Set task priority to',
                        description:
                            'Automatically sets the task priority to a numeric value.',
                        valueTemplate: {
                            inputType: 'NUMBER',
                            label: 'Priority',
                        },
                        supportedModes: ['SYNC', 'ASYNC'],
                    },
                    {
                        type: 'SET_TEAM_AND_ASSIGNEE',
                        label: 'Set task team and assignee to',
                        description:
                            'Assigns both the team and a member from that team.',
                        valueTemplate: {
                            inputType: 'TEAM_MEMBER',
                            label: 'Team and Assignee',
                        },
                        supportedModes: ['SYNC', 'ASYNC'],
                    },
                    {
                        type: 'AUTO_ASSIGN_CREATOR',
                        label: 'Assign task to its creator',
                        description:
                            'Automatically assigns the task back to its original creator.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: 'Assign to Creator',
                        },
                        supportedModes: ['SYNC', 'ASYNC'],
                    },
                ],
            };
        },

        taskAutomationRules: async (
            _parent: unknown,
            { projectId }: { projectId: string },
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return taskService.getAutomationRulesForProject(
                context.userId,
                projectId,
            );
        },
    },

    Mutation: {
        createTaskAutomationRule: async (
            _parent: unknown,
            { input }: { input: unknown },
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return taskService.createAutomationRule(
                context.userId,
                input as any,
            );
        },

        updateTaskAutomationRule: async (
            _parent: unknown,
            { input }: { input: unknown },
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return taskService.updateAutomationRule(
                context.userId,
                input as any,
            );
        },

        deleteTaskAutomationRule: async (
            _parent: unknown,
            { projectId, ruleId }: { projectId: string; ruleId: string },
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            const success = await taskService.deleteAutomationRule(
                context.userId,
                projectId,
                ruleId,
            );
            return { success, ruleId };
        },
    },
};
