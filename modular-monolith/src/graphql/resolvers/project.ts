import type { GraphQLContext } from '../context.ts';

interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export const projectResolvers = {
    Project: {
        id: (p: any) => p.id,
        name: (p: any) => p.name,
        description: (p: any) => p.description,
        creator: (p: any) => null,
        projectMembers: (p: any, args: PaginationArgs, context: GraphQLContext) => null,
        // teams, projectTasks, assignedTasks resolved in their respective files
        createdAt: (p: any) => p.createdAt,
        updatedAt: (p: any) => p.updatedAt,
        version: (p: any) => p.version,
        lastEventId: (p: any) => p.lastEventId,
    },

    ProjectMember: {
        id: (m: any) => m.id,
        project: (m: any) => null,
        user: (m: any) => null,
        createdAt: (m: any) => m.createdAt,
        version: (m: any) => m.version,
    },

    User: {
        projects: (u: any, args: PaginationArgs, context: GraphQLContext) => null,
    },

    Query: {
        project: (_: any, { id }: { id: string }, context: GraphQLContext) => {
            return null;
        },
        projects: (_: any, { ids }: { ids?: string[] }, context: GraphQLContext) => {
            return [];
        },
    },

    Mutation: {
        createProject: (_: any, { name, description }: { name: string; description?: string }, context: GraphQLContext) => {
            return null;
        },
        updateProject: (_: any, { id, name, description }: { id: string; name?: string; description?: string }, context: GraphQLContext) => {
            return null;
        },
        deleteProjects: (_: any, { projectIds }: { projectIds: string[] }, context: GraphQLContext) => {
            return { success: true, deletedCount: 0 };
        },
        addProjectMembers: (_: any, { projectId, userIds }: { projectId: string; userIds: string[] }, context: GraphQLContext) => {
            return { success: true, project: null };
        },
        removeProjectMembers: (_: any, { projectId, memberIds }: { projectId: string; memberIds: string[] }, context: GraphQLContext) => {
            return { success: true, removedCount: 0, project: null };
        },
    },
};
