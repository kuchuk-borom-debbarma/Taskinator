import type { GraphQLContext } from '../context.ts';

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
        id: (t: any) => t.id,
        title: (t: any) => t.title,
        description: (t: any) => t.description,
        status: (t: any) => t.status,
        priority: (t: any) => t.priority,
        dueDate: (t: any) => t.dueDate,
        project: (t: any) => null,
        team: (t: any) => null,
        assignedMember: (t: any) => null,
        neighbourLinks: (t: any, args: any, context: GraphQLContext) => null,
        version: (t: any) => t.version,
        lastEventId: (t: any) => t.lastEventId,
        createdBy: (t: any) => null,
        updatedBy: (t: any) => null,
        createdAt: (t: any) => t.createdAt,
        updatedAt: (t: any) => t.updatedAt,
    },

    TaskLink: {
        id: (l: any) => l.id,
        project: (l: any) => null,
        source: (l: any) => null,
        target: (l: any) => null,
        label: (l: any) => l.label,
        createdBy: (l: any) => null,
        createdAt: (l: any) => l.createdAt,
        updatedBy: (l: any) => null,
        updatedAt: (l: any) => l.updatedAt,
    },

    Project: {
        projectTasks: (p: any, args: any, context: GraphQLContext) => null,
        assignedTasks: (p: any, args: any, context: GraphQLContext) => null,
    },

    Query: {
        task: (_: any, { id }: { id: string }, context: GraphQLContext) => {
            return null;
        },
        tasks: (_: any, { ids }: { ids: string[] }, context: GraphQLContext) => {
            return [];
        },
    },

    Mutation: {
        task: () => ({}),
    },

    TaskMutation: {
        create: (_: any, { input }: { input: CreateTaskInput }, context: GraphQLContext) => {
            return null;
        },
        update: (_: any, { taskId, input }: { taskId: string; input: UpdateTaskInput }, context: GraphQLContext) => {
            return null;
        },
        delete: (_: any, { taskId }: { taskId: string }, context: GraphQLContext) => {
            return taskId;
        },
        createLink: (_: any, { input }: { input: CreateTaskLinkInput }, context: GraphQLContext) => {
            return null;
        },
        deleteLink: (_: any, { linkId }: { linkId: string }, context: GraphQLContext) => {
            return linkId;
        },
    },
};
