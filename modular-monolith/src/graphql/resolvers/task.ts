import type { GraphQLContext } from '../context.ts';
import { taskService } from '../../modules/task';
import type { ProjectTask } from '../../modules/task/TaskService.ts';

export const taskResolvers = {
    ProjectTask: {
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
        // creator: (t: any, _: any, context: GraphQLContext) =>
        //     context.loaders.user.load(t.createdBy),
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
        deleteTask: async (_: any, { taskId }: any, context: GraphQLContext) => {
            if (!context.userId) throw new Error('Unauthorized');
            await taskService.deleteTask(context.userId, taskId);
            return taskId;
        },
    },
};
