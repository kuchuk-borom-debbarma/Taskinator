import { taskService } from '../../../modules/task/index.ts';
import type { GraphQLContext } from '../context.ts';
import { UnauthorizedError } from '../errors.ts';

export const taskAutomationResolvers = {
    Query: {
        automationTemplatesCatalog: async (
            _parent: any,
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
                            'Triggers when a task status changes (e.g. to a column, from a column, or any status change).',
                        valueTemplate: {
                            inputType: 'SELECT_FROM_TO',
                            label: 'Status Transition',
                            dynamicOptionsSource: 'PROJECT_STATUSES',
                        },
                    },
                ],
                conditions: [
                    {
                        type: 'STATUS_EQUALS',
                        label: 'Task status is',
                        description:
                            'Checks if the task is currently in a specific status column.',
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
                            'Checks whether the task is assigned to a specific team member.',
                        valueTemplate: {
                            inputType: 'TEAM_MEMBER',
                            label: 'Assigned member',
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
                            label: 'Target Status',
                            dynamicOptionsSource: 'PROJECT_STATUSES',
                        },
                    },
                    {
                        type: 'SET_ASSIGNEE',
                        label: 'Set task assignee to',
                        description:
                            'Assigns the task to a team member (or the person who triggered the rule, or unassigns it).',
                        valueTemplate: {
                            inputType: 'TEAM_MEMBER',
                            label: 'Assignee',
                        },
                    },
                    {
                        type: 'REJECT_TRANSITION',
                        label: 'Block and warn user',
                        description:
                            'Synchronously rejects status movement and displays a warning warning message.',
                        valueTemplate: {
                            inputType: 'TEXT',
                            label: 'Rejection Warning Message',
                            placeholder: 'This transition is blocked!',
                        },
                    },
                ],
            };
        },
        taskAutomationRules: async (
            _parent: any,
            { projectId }: { projectId: string },
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return await taskService.getAutomationRulesForProject(
                context.userId,
                projectId,
            );
        },
    },
    Mutation: {
        createTaskAutomationRule: async (
            _parent: any,
            { input }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return await taskService.createAutomationRule(
                context.userId,
                input,
            );
        },
        updateTaskAutomationRule: async (
            _parent: any,
            { input }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return await taskService.updateAutomationRule(
                context.userId,
                input,
            );
        },
        deleteTaskAutomationRule: async (
            _parent: any,
            { projectId, ruleId }: any,
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
