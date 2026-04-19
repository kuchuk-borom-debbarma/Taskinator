import type { GraphQLContext } from '../context.ts';
import type { Task, TaskLink } from '../../modules/task/TaskService.ts';
import type { Project } from '../../modules/project/ProjectService.ts';
import { NotFoundError } from '../errors.ts';

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
            const team = await context.loaders.team.byId.load({
                actorId: context.userId || '',
                teamId: parent.teamId
            });
            if (!team) {
                throw new NotFoundError(`Team with ID ${parent.teamId} not found for task ${parent.id}`);
            }
            return team;
        },
        assignedMember: async (parent: Task, _args: any, context: GraphQLContext) => {
            if (!parent.memberId) return null;
            const user = await context.loaders.user.byId.load(parent.memberId);
            if (!user) {
                throw new NotFoundError(`Assigned User with ID ${parent.memberId} not found for task ${parent.id}`);
            }
            return user;
        },
        neighbourLinks: (parent: Task, _args: any, _context: GraphQLContext) => null,
        version: (parent: Task) => parent.version,
        lastEventId: (parent: Task) => parent.lastEventId,
        createdBy: async (parent: Task, _args: any, context: GraphQLContext) => {
            const user = await context.loaders.user.byId.load(parent.createdBy);
            if (!user) {
                throw new NotFoundError(`Creator User with ID ${parent.createdBy} not found for task ${parent.id}`);
            }
            return user;
        },
        updatedBy: async (parent: Task, _args: any, context: GraphQLContext) => {
            const user = await context.loaders.user.byId.load(parent.updatedBy);
            if (!user) {
                throw new NotFoundError(`Updater User with ID ${parent.updatedBy} not found for task ${parent.id}`);
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
        source: async (parent: TaskLink, _args: any, context: GraphQLContext) => {
            const task = await context.loaders.task.byId.load({
                actorId: context.userId || '',
                taskId: parent.sourceTaskId
            });
            if (!task) {
                throw new NotFoundError(`Source Task with ID ${parent.sourceTaskId} not found for link ${parent.id}`);
            }
            return task;
        },
        target: async (parent: TaskLink, _args: any, context: GraphQLContext) => {
            const task = await context.loaders.task.byId.load({
                actorId: context.userId || '',
                taskId: parent.targetTaskId
            });
            if (!task) {
                throw new NotFoundError(`Target Task with ID ${parent.targetTaskId} not found for link ${parent.id}`);
            }
            return task;
        },
        label: (parent: TaskLink) => parent.label,
        createdBy: async (parent: TaskLink, _args: any, context: GraphQLContext) => {
            const user = await context.loaders.user.byId.load(parent.createdBy);
            if (!user) {
                throw new NotFoundError(`Creator User with ID ${parent.createdBy} not found for task link ${parent.id}`);
            }
            return user;
        },
        createdAt: (parent: TaskLink) => parent.createdAt.toISOString(),
        updatedBy: (parent: TaskLink, _args: any, _context: GraphQLContext) => {
            return null;
        },
        updatedAt: (parent: TaskLink) => (parent as any).updatedAt?.toISOString() || null,
    },

    Project: {
        //TODO
        projectTasks: (parent: Project, _args: any, _context: GraphQLContext) => null,
        //TODO
        assignedTasks: (parent: Project, _args: any, _context: GraphQLContext) => null,
    },

    Query: {
        task: (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
            return context.loaders.task.byId.load({
                actorId: context.userId || '',
                taskId: id
            });
        },
        tasks: async (_parent: any, { ids }: { ids: string[] }, context: GraphQLContext) => {
            if (!ids || ids.length === 0) return [];
            const actorId = context.userId || '';
            const results = await context.loaders.task.byId.loadMany(
                ids.map(taskId => ({ actorId, taskId }))
            );
            return results.filter((res): res is Task => res !== null && !(res instanceof Error));
        },
    },

    Mutation: {
        task: () => ({}),
    },

    TaskMutation: {
        create: (_parent: any, { input }: { input: CreateTaskInput }, _context: GraphQLContext) => {
            return null;
        },
        update: (_parent: any, { taskId, input }: { taskId: string; input: UpdateTaskInput }, _context: GraphQLContext) => {
            return null;
        },
        delete: (_parent: any, { taskId }: { taskId: string }, _context: GraphQLContext) => {
            return taskId;
        },
        createLink: (_parent: any, { input }: { input: CreateTaskLinkInput }, _context: GraphQLContext) => {
            return null;
        },
        deleteLink: (_parent: any, { linkId }: { linkId: string }, _context: GraphQLContext) => {
            return linkId;
        },
    },
};
