import type { Project } from '../../modules/project/ProjectService.ts';
import { taskService } from '../../modules/task';
import type { Task, TaskLink } from '../../modules/task/TaskService.ts';
import type { PaginationParams } from '../../types/pagination.ts';
import { encodeCursor } from '../../utils/utils.ts';
import type { GraphQLContext } from '../context.ts';
import { NotFoundError, UnauthorizedError } from '../errors.ts';

interface CreateTaskInput {
    projectId: string;
    title: string;
    description?: string;
    status?: string;
}

interface UpdateTaskInput {
    projectId: string;
    version: number;
    title?: string;
    description?: string;
    status?: string;
    teamId?: string;
    memberId?: string;
}

interface CreateTaskLinkInput {
    projectId: string;
    sourceTaskId: string;
    targetTaskId: string;
    label: string;
}

export const taskResolvers = {
    Task: {
        id: (parent: Task) => parent.id,
        title: (parent: Task) => parent.title,
        description: (parent: Task) => parent.description,
        status: (parent: Task) => parent.status,
        priority: (parent: Task) => parent.priority,
        dueDate: (parent: Task) => (parent as any).dueDate || null,
        project: (parent: Task, _args: any, context: GraphQLContext) => {
            return context.loaders.project.byId.load(parent.projectId);
        },
        team: async (parent: Task, _args: any, context: GraphQLContext) => {
            if (!parent.teamId) return null;
            // Internal hydration
            const team = await context.loaders.team.byId.load(parent.teamId);
            if (!team) {
                throw new NotFoundError(
                    `Team with ID ${parent.teamId} not found for task ${parent.id}`,
                );
            }
            return team;
        },
        assignedMember: async (
            parent: Task,
            _args: any,
            context: GraphQLContext,
        ) => {
            if (!parent.memberId) return null;
            return context.loaders.user.byId.load(parent.memberId);
        },
        neighbourLinks: async (
            parent: Task,
            args: PaginationParams & {
                direction: 'incoming' | 'outgoing' | 'both';
                depthLimit: number;
            },
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const { direction, depthLimit, ...pagination } = args;

            const { links, nextCursor, prevCursor } =
                await taskService.getTaskLinks(
                    {
                        userId: context.userId,
                        projectId: parent.projectId,
                        taskId: parent.id,
                        direction: (direction === 'both'
                            ? 'incoming'
                            : direction) as 'incoming' | 'outgoing',
                    },
                    pagination,
                );

            return {
                edges: links.map((l: any) => ({
                    node: l,
                    cursor: encodeCursor(l.createdAt.toISOString(), l.id),
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
        version: (parent: Task) => parent.version,
        createdBy: async (
            parent: Task,
            _args: any,
            context: GraphQLContext,
        ) => {
            const user = await context.loaders.user.byId.load(parent.createdBy);
            if (!user) {
                throw new NotFoundError(
                    `Creator User with ID ${parent.createdBy} not found for task ${parent.id}`,
                );
            }
            return user;
        },
        updatedBy: async (
            parent: Task,
            _args: any,
            context: GraphQLContext,
        ) => {
            const user = await context.loaders.user.byId.load(parent.updatedBy);
            if (!user) {
                throw new NotFoundError(
                    `Updater User with ID ${parent.updatedBy} not found for task ${parent.id}`,
                );
            }
            return user;
        },
        createdAt: (parent: Task) => parent.createdAt.toISOString(),
        updatedAt: (parent: Task) => parent.updatedAt.toISOString(),
    },

    TaskLink: {
        id: (parent: TaskLink) => parent.id,
        project: (parent: TaskLink, _args: any, context: GraphQLContext) => {
            return context.loaders.project.byId.load(parent.projectId);
        },
        source: async (
            parent: TaskLink,
            _args: any,
            context: GraphQLContext,
        ) => {
            // Internal hydration
            const task = await context.loaders.task.byId.load(
                parent.sourceTaskId,
            );
            if (!task) {
                throw new NotFoundError(
                    `Source Task with ID ${parent.sourceTaskId} not found for link ${parent.id}`,
                );
            }
            return task;
        },
        target: async (
            parent: TaskLink,
            _args: any,
            context: GraphQLContext,
        ) => {
            // Internal hydration
            const task = await context.loaders.task.byId.load(
                parent.targetTaskId,
            );
            if (!task) {
                throw new NotFoundError(
                    `Target Task with ID ${parent.targetTaskId} not found for link ${parent.id}`,
                );
            }
            return task;
        },
        label: (parent: TaskLink) => parent.label,
        createdBy: async (
            parent: TaskLink,
            _args: any,
            context: GraphQLContext,
        ) => {
            const user = await context.loaders.user.byId.load(parent.createdBy);
            if (!user) {
                throw new NotFoundError(
                    `Creator User with ID ${parent.createdBy} not found for task link ${parent.id}`,
                );
            }
            return user;
        },
        createdAt: (parent: TaskLink) => parent.createdAt.toISOString(),
        updatedBy: (
            _parent: TaskLink,
            _args: any,
            _context: GraphQLContext,
        ) => {
            return null;
        },
        updatedAt: (parent: TaskLink) =>
            (parent as any).updatedAt?.toISOString() || null,
    },

    Project: {
        projectTasks: async (
            parent: Project,
            args: PaginationParams,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const { tasks, nextCursor, prevCursor } =
                await taskService.getTasks(context.userId, parent.id, args);

            return {
                edges: tasks.map((t: any) => ({
                    node: t,
                    cursor: encodeCursor(
                        t.epochPrecision || t.createdAt.toISOString(),
                        t.id,
                    ),
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
        assignedTasks: async (
            parent: Project,
            args: PaginationParams,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();

            const { tasks, nextCursor, prevCursor } =
                await taskService.getTasks(context.userId, parent.id, {
                    ...args,
                    memberId: context.userId,
                });

            return {
                edges: tasks.map((t: any) => ({
                    node: t,
                    cursor: encodeCursor(
                        t.epochPrecision || t.createdAt.toISOString(),
                        t.id,
                    ),
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

    Query: {
        task: (
            _parent: any,
            { id }: { id: string },
            context: GraphQLContext,
        ) => {
            return context.loaders.task.byActorIdAndId.load({
                actorId: context.userId || '',
                id: id,
            });
        },
        tasks: async (
            _parent: any,
            { ids }: { ids: string[] },
            context: GraphQLContext,
        ) => {
            if (!ids || ids.length === 0) return [];
            const actorId = context.userId || '';
            const results = await context.loaders.task.byActorIdAndId.loadMany(
                ids.map((id) => ({ actorId, id })),
            );
            return results.filter(
                (res): res is Task => res !== null && !(res instanceof Error),
            );
        },
    },

    Mutation: {
        task: () => ({}),
    },

    TaskMutation: {
        create: async (
            _parent: any,
            { input }: { input: CreateTaskInput },
            context: GraphQLContext,
        ): Promise<Task> => {
            if (!context.userId) throw new UnauthorizedError();
            return await taskService.createTask({
                actorId: context.userId,
                projectId: input.projectId,
                title: input.title,
                description: input.description,
                status: input.status,
            });
        },
        update: async (
            _parent: any,
            { taskId, input }: { taskId: string; input: UpdateTaskInput },
            context: GraphQLContext,
        ): Promise<Task> => {
            if (!context.userId) throw new UnauthorizedError();
            return await taskService.updateTask({
                actorId: context.userId,
                taskId,
                projectId: input.projectId,
                version: input.version,
                title: input.title,
                description: input.description,
                status: input.status,
                teamId: input.teamId,
                memberId: input.memberId,
            });
        },
        delete: async (
            _parent: any,
            { projectId, taskId }: { projectId: string; taskId: string },
            context: GraphQLContext,
        ): Promise<string> => {
            if (!context.userId) throw new UnauthorizedError();
            return await taskService.deleteTask({
                actorId: context.userId,
                projectId,
                taskId,
            });
        },
        createLink: async (
            _parent: any,
            { input }: { input: CreateTaskLinkInput },
            context: GraphQLContext,
        ): Promise<TaskLink> => {
            if (!context.userId) throw new UnauthorizedError();
            return await taskService.createTaskLink({
                actorId: context.userId,
                projectId: input.projectId,
                sourceTaskId: input.sourceTaskId,
                targetTaskId: input.targetTaskId,
                label: input.label,
            });
        },
        deleteLink: async (
            _parent: any,
            { projectId, linkId }: { projectId: string; linkId: string },
            context: GraphQLContext,
        ): Promise<string> => {
            if (!context.userId) throw new UnauthorizedError();
            return await taskService.deleteTaskLink({
                actorId: context.userId,
                projectId,
                linkId,
            });
        },
        updateLink: async (
            _parent: any,
            { input }: { input: UpdateTaskLinkInput },
            context: GraphQLContext,
        ): Promise<TaskLink> => {
            if (!context.userId) throw new UnauthorizedError();
            return await taskService.updateTaskLink({
                actorId: context.userId,
                projectId: input.projectId,
                linkId: input.linkId,
                sourceTaskId: input.sourceTaskId,
                targetTaskId: input.targetTaskId,
                label: input.label,
            });
        },
    },
    TaskLabelCount: {
        count: () => 0,
    },
};
