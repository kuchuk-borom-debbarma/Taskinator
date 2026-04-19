import type { GraphQLContext } from '../context.ts';
import type { ProjectTask, TaskLink } from '../../modules/task/TaskService.ts';
import type { Project } from '../../modules/project/ProjectService.ts';

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
        id: (parent: ProjectTask) => parent.id,
        title: (parent: ProjectTask) => parent.title,
        description: (parent: ProjectTask) => parent.description,
        status: (parent: ProjectTask) => parent.status,
        priority: (parent: ProjectTask) => parent.priority,
        dueDate: (parent: ProjectTask) => (parent as any).dueDate || null,
        project: (parent: ProjectTask, _args: any, context: GraphQLContext) => {
            //TODO safety throw not found
            return context.loaders.project.byId.load(parent.projectId);
        },
        team: (parent: ProjectTask, _args: any, _context: GraphQLContext) => {
            // Need team loader
            return null;
        },
        assignedMember: (parent: ProjectTask, _args: any, context: GraphQLContext) => {
            if (!parent.memberId) return null;
            //TODO throw safety not found although assigned error
            return context.loaders.user.byId.load(parent.memberId);
        },
        //TODO
        neighbourLinks: (parent: ProjectTask, _args: any, _context: GraphQLContext) => null,
        version: (parent: ProjectTask) => parent.version,
        lastEventId: (parent: ProjectTask) => parent.lastEventId,
        createdBy: (parent: ProjectTask, _args: any, context: GraphQLContext) => {
            //TODO safety throw not found
            return context.loaders.user.byId.load(parent.createdBy);
        },
        updatedBy: (parent: ProjectTask, _args: any, context: GraphQLContext) => {
            //TODO safety throw not found
            return context.loaders.user.byId.load(parent.updatedBy);
        },
        createdAt: (parent: ProjectTask) => parent.createdAt.toISOString(),
        updatedAt: (parent: ProjectTask) => parent.updatedAt.toISOString(),
    },

    TaskLink: {
        id: (parent: TaskLink) => parent.id,
        project: (parent: TaskLink, _args: any, context: GraphQLContext) => {
            //TODO safety throw not found
            return context.loaders.project.byId.load(parent.projectId);
        },
        source: (parent: TaskLink, _args: any, _context: GraphQLContext) => {
            // Need task loader
            return null;
        },
        target: (parent: TaskLink, _args: any, _context: GraphQLContext) => {
            // Need task loader
            return null;
        },
        label: (parent: TaskLink) => parent.label,
        createdBy: (parent: TaskLink, _args: any, context: GraphQLContext) => {
            //TODO safety throw not found
            return context.loaders.user.byId.load(parent.createdBy);
        },
        createdAt: (parent: TaskLink) => parent.createdAt.toISOString(),
        updatedBy: (parent: TaskLink, _args: any, _context: GraphQLContext) => {
            // TaskLink in service doesn't have updatedBy? Let's check.
            // Based on TaskService.ts, it doesn't.
            return null;
        },
        updatedAt: (parent: TaskLink) => (parent as any).updatedAt?.toISOString() || null,
    },

    Project: {
        //TODO define args type properly
        projectTasks: (parent: Project, _args: any, _context: GraphQLContext) => null,
        //TODO define args type properly
        assignedTasks: (parent: Project, _args: any, _context: GraphQLContext) => null,
    },

    Query: {
        //TODO use dataloader no safety required
        task: (_parent: any, { id }: { id: string }, _context: GraphQLContext) => {
            return null;
        },
        //TODO use dataloaders
        tasks: (_parent: any, { ids }: { ids: string[] }, _context: GraphQLContext) => {
            return [];
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
