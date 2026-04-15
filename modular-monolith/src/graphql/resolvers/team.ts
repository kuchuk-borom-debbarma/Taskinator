import type { GraphQLContext } from '../context.ts';
import { teamService } from '../../modules/team';

export const teamResolvers = {
  Team: {
    createdAt: (t: any) => (t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt),
    updatedAt: (t: any) => (t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt),
    creator: (t: any, _: any, context: GraphQLContext) => context.loaders.user.load(t.createdBy),
    automations: (t: any, _: any, context: GraphQLContext) => context.loaders.teamAutomations.load(t.id),
  },
  TeamMember: {
    createdAt: (m: any) => (m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt),
    user: (m: any, _: any, context: GraphQLContext) => context.loaders.user.load(m.userId),
  },
  Query: {
    teams: async (_: any, { projectId, first, after }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { teams, nextCursor } = await teamService.getTeams(
        context.userId,
        projectId,
        {
          limit: first,
          cursor: after,
        }
      );
      return {
        edges: teams.map((t) => ({ node: t, cursor: t.id })),
        pageInfo: { hasNextPage: !!nextCursor, endCursor: nextCursor, hasPreviousPage: false },
      };
    },
    teamMembers: async (_: any, { projectId, teamId, first, after }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { members, nextCursor } = await teamService.getTeamMembers(
        context.userId,
        projectId,
        teamId,
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
    searchTeamUsers: async (_: any, { projectId, teamId, search, first, after }: any, context: GraphQLContext) => {
      const { users, nextCursor } = await teamService.searchTeamUsers({
        actorId: context.userId!,
        projectId,
        teamId,
        search,
        cursor: after,
        limit: first,
      });
      return {
        edges: users.map((u) => ({ node: u, cursor: u.id })),
        pageInfo: { hasNextPage: !!nextCursor, endCursor: nextCursor, hasPreviousPage: false },
      };
    },
  },
  Mutation: {
    createTeam: async (_: any, { projectId, name }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const teams = await teamService.createTeams({
        userId: context.userId,
        projectId,
        teams: [name],
      });
      return teams[0];
    },
    deleteTeams: async (_: any, { projectId, teamIds }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return teamService.deleteTeams({
        userId: context.userId,
        projectId,
        teamIds,
      });
    },
    addTeamMembers: async (_: any, { projectId, teamId, userIds }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return teamService.addTeamMembers({
        userId: context.userId,
        projectId,
        teamId,
        members: userIds,
      });
    },
    removeTeamMembers: async (_: any, { projectId, teamId, userIds }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return teamService.deleteTeamMembers({
        userId: context.userId,
        projectId,
        teamId,
        members: userIds,
      });
    },
  },
};
