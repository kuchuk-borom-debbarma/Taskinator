import type { GraphQLContext } from '../context.ts';
import { taskService } from '../../modules/task';
import type { ProjectTask, TaskLink } from '../../modules/task/TaskService.ts';
import { resolveTask, buildRef } from './helpers.ts';

const buildLinkConnection = (
    links: TaskLink[],
    nextCursor: string | null,
    prevCursor: string | null,
) => ({
    edges: links.map((l: TaskLink) => ({
        node: l,
        cursor: `${l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt}|${l.id}`,
    })),
    pageInfo: {
        hasNextPage: !!nextCursor,
        hasPreviousPage: !!prevCursor,
        startCursor: prevCursor,
        endCursor: nextCursor,
    },
});

export const taskResolvers = {
    TaskLink: {
        id: (l: any) => l.id,
        projectId: (l: any) => l.projectId,
        sourceTaskId: (l: any) => l.sourceTaskId,
        targetTaskId: (l: any) => l.targetTaskId,
        label: (l: any) => l.label,
        createdBy: (l: any) => l.createdBy,
        createdAt: (l: any) =>
            l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
        sourceTask: (l: any) => buildRef(l.sourceTaskId, 'ProjectTask'),
        targetTask: (l: any) => buildRef(l.targetTaskId, 'ProjectTask'),
    },

    NeighbourhoodNode: {
        task: (n: any) => buildRef(n.taskId, 'ProjectTask'),
    },

    ProjectTask: {
        id: (t: any) => t.id,
        projectId: (t: any) => t.projectId,
        teamId: (t: any) => t.teamId,
        memberId: (t: any) => t.memberId,
        title: async (t: any, _: any, context: GraphQLContext) => {
            const task = await resolveTask(t, context);
            return task?.title;
        },
        description: async (t: any, _: any, context: GraphQLContext) => {
            const task = await resolveTask(t, context);
            return task?.description;
        },
        status: async (t: any, _: any, context: GraphQLContext) => {
            const task = await resolveTask(t, context);
            return task?.status;
        },
        createdAt: async (t: any) => {
            const task = await resolveTask(t, null as any);
            const date = task?.createdAt ?? t.createdAt;
            return date instanceof Date ? date.toISOString() : date;
        },
        updatedAt: async (t: any) => {
            const task = await resolveTask(t, null as any);
            const date = task?.updatedAt ?? t.updatedAt;
            return date instanceof Date ? date.toISOString() : date;
        },
        priority: () => 3, // Default to Medium
        dueDate: () => null, // Default to no deadline
        project: (t: any) => buildRef(t.projectId, 'Project'),
        team: (t: any) => buildRef(t.teamId, 'Team'),
        member: (t: any) => buildRef(t.memberId, 'User'),
        assignee: (t: any) => buildRef(t.memberId, 'User'),
        creator: (t: any) => buildRef(t.createdBy, 'User'),
        updater: (t: any) => buildRef(t.updatedBy, 'User'),

        incomingLinks: async (
            t: any,
            { first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            const { links, nextCursor, prevCursor } = await taskService.getTaskLinks(
                { userId: context.userId, projectId: t.projectId, taskId: t.id, direction: 'incoming' },
                { first, after, last, before },
            );
            return buildLinkConnection(links, nextCursor, prevCursor);
        },

        outgoingLinks: async (
            t: any,
            { first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            const { links, nextCursor, prevCursor } = await taskService.getTaskLinks(
                { userId: context.userId, projectId: t.projectId, taskId: t.id, direction: 'outgoing' },
                { first, after, last, before },
            );
            return buildLinkConnection(links, nextCursor, prevCursor);
        },
    },

    Query: {
        projectTasks: async (
            _: any,
            { projectId, first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            const { tasks, nextCursor, prevCursor } = await taskService.getTasks(
                context.userId,
                projectId,
                { first, after, last, before },
            );

            return {
                edges: tasks.map((t: ProjectTask) => ({
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
        task: async (_: any, { id }: any, context: GraphQLContext) => {
            if (!context.userId) throw new Error('Unauthorized');
            return context.loaders.task.load(id);
        },
        taskNeighbourhood: async (
            _: any,
            { projectId, taskId, maxDepth, first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');

            const [focusedTask, result] = await Promise.all([
                context.loaders.task.load(taskId),
                taskService.getTaskNeighbourhood({
                    userId: context.userId,
                    projectId,
                    taskId,
                    maxDepth,
                    first,
                    after,
                    last,
                    before,
                }),
            ]);

            if (!focusedTask) throw new Error('Task not found');

            return {
                focusedTask,
                nodes: result.neighbours,
                edges: result.edges,
                pageInfo: {
                    hasNextPage: !!result.nextCursor,
                    hasPreviousPage: !!result.prevCursor,
                    startCursor: result.prevCursor,
                    endCursor: result.nextCursor,
                },
            };
        },
    },

    Mutation: {
        createTask: async (
            _: any,
            { projectId, teamId, memberId, title, description, status }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            return taskService.createTask({
                userId: context.userId,
                projectId,
                teamId,
                memberId,
                title,
                description,
                status,
            });
        },
        updateTask: async (
            _: any,
            { taskId, title, description, status }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            return taskService.updateTask({
                userId: context.userId,
                taskId,
                title,
                description,
                status,
            });
        },
        deleteTask: async (_: any, { taskId }: any, context: GraphQLContext) => {
            if (!context.userId) throw new Error('Unauthorized');
            await taskService.deleteTask(context.userId, taskId);
            return taskId;
        },
        createTaskLink: async (
            _: any,
            { projectId, sourceTaskId, targetTaskId, label }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            return taskService.createLink({
                userId: context.userId,
                projectId,
                sourceTaskId,
                targetTaskId,
                label,
            });
        },
        deleteTaskLink: async (_: any, { linkId }: any, context: GraphQLContext) => {
            if (!context.userId) throw new Error('Unauthorized');
            await taskService.deleteLink(context.userId, linkId);
            return linkId;
        },
    },
};
