import type { GraphQLContext } from '../context.ts';
import { projectService } from '../../modules/project';

export const projectResolvers = {
  Project: {
    createdAt: (p: any) => (p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt),
    updatedAt: (p: any) => (p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt),
    creator: (p: any, _: any, context: GraphQLContext) => context.loaders.user.load(p.userId),
  },
  ProjectMember: {
    createdAt: (m: any) => (m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt),
    user: (m: any, _: any, context: GraphQLContext) => context.loaders.user.load(m.userId),
  },
  Query: {
    projects: async (_: any, { first, after }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { projects, nextCursor } = await projectService.getProjects(context.userId, {
        limit: first,
        cursor: after,
      });

      return {
        edges: projects.map((p) => ({
          node: p,
          cursor: `${p.createdAt}|${p.id}`,
        })),
        pageInfo: {
          hasNextPage: !!nextCursor,
          endCursor: nextCursor,
          hasPreviousPage: false,
        },
      };
    },
    project: async (_: any, { id }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return projectService.getProject(context.userId, id);
    },
    projectMembers: async (_: any, { projectId, first, after }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { members, nextCursor } = await projectService.getProjectMembers(
        context.userId,
        projectId,
        {
          limit: first,
          cursor: after,
        }
      );
      return {
        edges: members.map((m) => ({ node: m, cursor: m.id })),
        pageInfo: { hasNextPage: !!nextCursor, endCursor: nextCursor, hasPreviousPage: false },
      };
    },
  },
  Mutation: {
    createProject: async (_: any, { name, description }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return projectService.createProject({
        name,
        description,
        userId: context.userId,
      });
    },
    updateProject: async (_: any, { id, name, description }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return projectService.updateProject({
        userId: context.userId,
        projectId: id,
        name,
        description,
      });
    },
    deleteProjects: async (_: any, { projectIds }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      await projectService.deleteProjects({
        userId: context.userId,
        projectIds,
      });
      return true;
    },
    addProjectMembers: async (_: any, { projectId, userIds }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return projectService.addProjectMembers({
        userId: context.userId,
        projectId,
        usersToAdd: userIds,
      });
    },
    removeProjectMembers: async (_: any, { projectId, memberIds }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      await projectService.deleteProjectMembers({
        userId: context.userId,
        projectId,
        memberIds,
      });
      return memberIds;
    },
  },
};
