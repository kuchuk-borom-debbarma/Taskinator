import type { GraphQLContext } from '../context.ts';
import type { Task, TaskLink } from '../../modules/task/TaskService.ts';
import type { Project } from '../../modules/project/ProjectService.ts';
import { NotFoundError, UnauthorizedError } from '../errors.ts';
import { taskService } from '../../modules/task';
import { encodeCursor } from '../../utils/utils.ts';

interface PaginationArgs {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
}

interface CreateTaskInput {
    projectId: string;
    title: string;
    description?: string;
    status?: string;
    teamId?: string;
    memberId?: string;
}

interface UpdateTaskInput {
    title?: string;
    description?: string;
    status?: string;
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
            args: any,
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
                        direction:
                            direction === 'both' ? 'incoming' : direction,
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
        lastEventId: (parent: Task) => parent.lastEventId,
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
        updatedBy: (parent: TaskLink, _args: any, _context: GraphQLContext) => {
            return null;
        },
        updatedAt: (parent: TaskLink) =>
            (parent as any).updatedAt?.toISOString() || null,
    },

    Project: {
        projectTasks: async (
            parent: Project,
            args: any,
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
            args: any,
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
        create: (
            _parent: any,
            { input }: { input: CreateTaskInput },
            _context: GraphQLContext,
        ) => {
            return null;
        },
        update: (
            _parent: any,
            { taskId, input }: { taskId: string; input: UpdateTaskInput },
            _context: GraphQLContext,
        ) => {
            return null;
        },
        delete: (
            _parent: any,
            { taskId }: { taskId: string },
            _context: GraphQLContext,
        ) => {
            return taskId;
        },
        createLink: (
            _parent: any,
            { input }: { input: CreateTaskLinkInput },
            _context: GraphQLContext,
        ) => {
            return null;
        },
        deleteLink: (
            _parent: any,
            { linkId }: { linkId: string },
            _context: GraphQLContext,
        ) => {
            return linkId;
        },
    },
};
