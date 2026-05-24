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
                        type: 'TASK_STATUS_CHANGED',
                        label: 'When task status changes to',
                        description:
                            'Triggers when a task enters a specific status column.',
                        valueTemplate: {
                            inputType: 'SELECT',
                            label: 'Select Status',
                            dynamicOptionsSource: 'PROJECT_STATUSES',
                        },
                    },
                    {
                        type: 'PREREQUISITE_COMPLETED',
                        label: 'When all blocker prerequisites are completed',
                        description:
                            'Fires in the background when blocker dependencies are marked DONE.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: '',
                        },
                    },
                    {
                        type: 'MEMBER_ASSIGNED',
                        label: 'When a member is assigned',
                        description:
                            'Triggers when a task receives an assignee.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: '',
                        },
                    },
                ],
                conditions: [
                    {
                        type: 'IS_BLOCKED',
                        label: 'If the task has active blockers',
                        description: 'Checks if prerequisites are incomplete.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: '',
                        },
                    },
                    {
                        type: 'ALL_PREREQUISITES_DONE',
                        label: 'If all prerequisite tasks are completed',
                        description: 'Checks if blockers count reaches 0.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: '',
                        },
                    },
                    {
                        type: 'HAS_NO_ASSIGNEE',
                        label: 'If the task has no assignee',
                        description: 'Checks whether no member is assigned.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: '',
                        },
                    },
                    {
                        type: 'TAG_CONTAINS',
                        label: 'If a task tag contains',
                        description:
                            'Checks whether task tags include a matching value.',
                        valueTemplate: {
                            inputType: 'TEXT',
                            label: 'Tag',
                            placeholder: 'auto:escalate',
                        },
                    },
                ],
                actions: [
                    {
                        type: 'SET_STATUS',
                        label: 'Set task status to',
                        description:
                            'Transitions task to target status column.',
                        valueTemplate: {
                            inputType: 'SELECT',
                            label: 'Target Status',
                            dynamicOptionsSource: 'PROJECT_STATUSES',
                        },
                    },
                    {
                        type: 'SET_ASSIGNEE_TO_ACTOR',
                        label: 'Assign task to actor',
                        description:
                            'Assigns the task to the user who triggered the automation.',
                        valueTemplate: {
                            inputType: 'NONE',
                            label: '',
                        },
                    },
                    {
                        type: 'REJECT_TRANSITION',
                        label: 'Reject the drag-and-drop status transition',
                        description:
                            'Synchronously rejects status movement and displays a warning.',
                        valueTemplate: {
                            inputType: 'TEXT',
                            label: 'Custom Rejection Message',
                            placeholder: 'Task is blocked!',
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
