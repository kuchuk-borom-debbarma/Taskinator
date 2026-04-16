import type { GraphQLContext } from '../context.ts';
import { taskService } from '../../modules/task';
import { automationService } from '../../modules/automation';
import { pubsub } from '../pubsub';

export const taskResolvers = {
    Task: {
        createdAt: (t: any) =>
            t.createdAt instanceof Date
                ? t.createdAt.toISOString()
                : t.createdAt,
        updatedAt: (t: any) =>
            t.updatedAt instanceof Date
                ? t.updatedAt.toISOString()
                : t.updatedAt,
        project: (t: any, _: any, context: GraphQLContext) =>
            context.loaders.project.load(t.projectId),
        team: (t: any, _: any, context: GraphQLContext) =>
            t.teamId ? context.loaders.team.load(t.teamId) : null,
        assignee: (t: any, _: any, context: GraphQLContext) =>
            t.memberId ? context.loaders.user.load(t.memberId) : null,
        creator: (t: any, _: any, context: GraphQLContext) =>
            context.loaders.user.load(t.createdBy),
        automations: (t: any, _: any, context: GraphQLContext) =>
            context.loaders.taskAutomations.load(t.id),
        links: async (t: any, _: any, context: GraphQLContext) => {
            const result = await context.loaders.taskLinks.load({
                projectId: t.projectId,
                taskId: t.id,
            });
            return result.direct;
        },
        story: async (t: any, _: any, context: GraphQLContext) => {
            const result = await context.loaders.taskLinks.load({
                projectId: t.projectId,
                taskId: t.id,
            });
            return result.story;
        },
    },
    TaskLink: {
        toTask: (l: any, _: any, context: GraphQLContext) =>
            context.loaders.task.load({
                projectId: l.projectId,
                taskId: l.toTaskId,
            }),
    },
    TaskStory: {
        pathTasks: (s: any, _: any, context: GraphQLContext) => {
            return Promise.all(
                s.pathTaskIds.map((id: string) =>
                    context.loaders.task.load({ projectId: s.projectId, taskId: id })
                )
            );
        },
    },
    Query: {
        tasks: async (
            _: any,
            { projectId, parentId, first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            const { tasks, nextCursor, prevCursor } = await taskService.getTasks(
                context.userId,
                projectId,
                {
                    parentId,
                    limit: first || last,
                    after,
                    before,
                },
            );

            return {
                edges: tasks.map((t) => ({
                    node: t,
                    cursor: `${t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt}|${t.id}`,
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
    },
    Mutation: {
        createTask: async (_: any, args: any, context: GraphQLContext) => {
            if (!context.userId) throw new Error('Unauthorized');
            const { parentTaskId, ...data } = args; // Purge legacy field if it somehow slips through
            return taskService.createTask({
                ...data,
                userId: context.userId,
                initialStatus: 'TODO',
            });
        },
        updateTasks: async (
            _: any,
            { projectId, tasks }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            return taskService.updateTasks({
                userId: context.userId,
                projectId,
                tasks,
            });
        },
        deleteTasks: async (
            _: any,
            { projectId, taskIds }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            return taskService.deleteTask({
                userId: context.userId,
                projectId,
                taskIds,
            });
        },
        createTaskLink: async (_: any, args: any, context: GraphQLContext) => {
            if (!context.userId) throw new Error('Unauthorized');
            return taskService.createLink({
                ...args,
                userId: context.userId,
            });
        },
        deleteTaskLink: async (_: any, args: any, context: GraphQLContext) => {
            if (!context.userId) throw new Error('Unauthorized');
            await taskService.deleteLink({
                ...args,
                userId: context.userId,
            });
            return true;
        },
    },
};
