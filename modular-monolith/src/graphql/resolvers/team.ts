import type { GraphQLContext } from '../context.ts';
import type { Team, TeamMember } from '../../modules/team';
import type { Project } from '../../modules/project/ProjectService.ts';
import { NotFoundError } from '../errors.ts';

interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export const teamResolvers = {
    Team: {
        id: (parent: Team) => parent.id,
        name: (parent: Team) => parent.name,
        project: (parent: Team, _args: any, context: GraphQLContext) => {
            return context.loaders.project.byId.load(parent.projectId);
        },
        members: (parent: Team, _args: PaginationArgs, _context: GraphQLContext) => null,
        tasks: (parent: Team, _args: PaginationArgs, _context: GraphQLContext) => null,
        createdBy: async (parent: Team, _args: any, context: GraphQLContext) => {
            const user = await context.loaders.user.byId.load(parent.createdBy);
            if (!user) {
                throw new NotFoundError(`Creator User with ID ${parent.createdBy} not found for team ${parent.id}`);
            }
            return user;
        },
        createdAt: (parent: Team) => parent.createdAt.toISOString(),
        updatedAt: (parent: Team) => parent.updatedAt?.toISOString() || null,
        version: (parent: Team) => parent.version,
        lastEventId: (parent: Team) => parent.lastEventId,
    },

    TeamMember: {
        id: (parent: TeamMember) => parent.id,
        user: async (parent: TeamMember, _args: any, context: GraphQLContext) => {
            const user = await context.loaders.user.byId.load(parent.userId);
            if (!user) {
                throw new NotFoundError(`User with ID ${parent.userId} not found for team member ${parent.id}`);
            }
            return user;
        },
        team: async (parent: TeamMember, _args: any, context: GraphQLContext) => {
            const team = await context.loaders.team.byId.load({
                actorId: context.userId || '',
                teamId: parent.teamId
            });
            if (!team) {
                throw new NotFoundError(`Team with ID ${parent.teamId} not found for member ${parent.id}`);
            }
            return team;
        },
        createdAt: (parent: TeamMember) => parent.createdAt.toISOString(),
        version: (parent: TeamMember) => parent.version,
    },

    Project: {
        teams: (parent: Project, _args: PaginationArgs, _context: GraphQLContext) => null,
    },

    Query: {
        team: (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
            return context.loaders.team.byId.load({
                actorId: context.userId || '',
                teamId: id
            });
        },
        teams: async (_parent: any, { ids }: { ids?: string[] }, context: GraphQLContext) => {
            if (!ids || ids.length === 0) return [];
            const actorId = context.userId || '';
            const results = await context.loaders.team.byId.loadMany(
                ids.map(teamId => ({ actorId, teamId }))
            );
            return results.filter((res): res is Team => res !== null && !(res instanceof Error));
        },
        teamMembers: (_parent: any, { teamId, first, after, last, before }: any, _context: GraphQLContext) => {
            return null;
        },
    },

    Mutation: {
        createTeam: (_parent: any, { projectId, name }: { projectId: string; name: string }, _context: GraphQLContext) => {
            return { success: true, team: null };
        },
        deleteTeams: (_parent: any, { projectId, teamIds }: { projectId: string; teamIds: string[] }, _context: GraphQLContext) => {
            return { success: true, deletedCount: 0, project: null };
        },
        addTeamMembers: (_parent: any, { projectId, teamId, userIds }: { projectId: string; teamId: string; userIds: string[] }, _context: GraphQLContext) => {
            return { success: true, team: null };
        },
        removeTeamMembers: (_parent: any, { projectId, teamId, userIds }: { projectId: string; teamId: string; userIds: string[] }, _context: GraphQLContext) => {
            return { success: true, team: null };
        },
    },
};
