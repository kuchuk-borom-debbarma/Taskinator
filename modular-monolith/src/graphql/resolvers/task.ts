import type { GraphQLContext } from '../context.ts';
import { taskService } from '../../modules/task';
import type { ProjectTask, TaskLink } from '../../modules/task/TaskService.ts';

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
        createdAt: (l: any) =>
            l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
        // Resolved via DataLoader — avoids N+1 when many links are resolved at once
        sourceTask: (l: any, _: any, context: GraphQLContext) =>
            context.loaders.task.load(l.sourceTaskId),
        targetTask: (l: any, _: any, context: GraphQLContext) =>
            context.loaders.task.load(l.targetTaskId),
    },

    NeighbourhoodNode: {
        task: (n: any, _: any, context: GraphQLContext) =>
            context.loaders.task.load(n.taskId),
    },

    ProjectTask: {
        createdAt: (t: any) =>
            t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
        updatedAt: (t: any) =>
            t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
        project: (t: any, _: any, context: GraphQLContext) =>
            context.loaders.project.load(t.projectId),
        team: (t: any, _: any, context: GraphQLContext) =>
            t.teamId ? context.loaders.team.load(t.teamId) : null,

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
