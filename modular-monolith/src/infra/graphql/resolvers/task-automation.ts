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
    { conditions: string[]; actions: string[] }
> = {
    STATUS_CHANGED: {
        conditions: [
            'STATUS_EQUALS',
            'ASSIGNEE_EQUALS',
            'HAS_INCOMPLETE_DESCENDANTS',
        ],
        actions: ['SET_STATUS', 'SET_ASSIGNEE', 'REJECT_TRANSITION'],
    },

    DESCENDANT_STATUS_CHANGED: {
        conditions: ['ALL_DESCENDANTS_IN_STATUS'],
        actions: [
            'SET_STATUS',
            'SET_ASSIGNEE',
            // REJECT_TRANSITION intentionally excluded:
            // the descendant's transition already committed at this point.
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
                        label: 'Status changes',
                        description:
                            'Fires when a task status changes. ' +
                            'Optionally filter by the specific from-status, to-status, or both.',
                        valueTemplate: {
                            inputType: 'SELECT_FROM_TO',
                            label: 'Status transition',
                            dynamicOptionsSource: 'PROJECT_STATUSES',
                        },
                        ...TRIGGER_COMPATIBILITY.STATUS_CHANGED,
                    },
                    {
                        type: 'DESCENDANT_STATUS_CHANGED',
                        label: 'A descendant status changes',
                        description:
                            'Fires on a parent task when any of its descendants (direct or ' +
                            'transitive) changes status. Use this to build parent-level cascade rules.',
                        valueTemplate: {
                            inputType: 'SELECT_FROM_TO',
                            label: 'Descendant status transition',
                            dynamicOptionsSource: 'PROJECT_STATUSES',
                        },
                        ...TRIGGER_COMPATIBILITY.DESCENDANT_STATUS_CHANGED,
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
