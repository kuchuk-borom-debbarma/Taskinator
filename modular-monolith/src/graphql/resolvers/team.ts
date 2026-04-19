import type { GraphQLContext } from '../context.ts';
import type { Team, TeamMember } from '../../modules/team/TeamService.ts';
import type { Project } from '../../modules/project/ProjectService.ts';

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
        createdBy: (parent: Team, _args: any, context: GraphQLContext) => {
            return context.loaders.user.byId.load(parent.createdBy);
        },
        createdAt: (parent: Team) => parent.createdAt.toISOString(),
        updatedAt: (parent: Team) => parent.updatedAt?.toISOString() || null,
        version: (parent: Team) => parent.version,
        lastEventId: (parent: Team) => parent.lastEventId,
    },

    TeamMember: {
        id: (parent: TeamMember) => parent.id,
        user: (parent: TeamMember, _args: any, context: GraphQLContext) => {
            return context.loaders.user.byId.load(parent.userId);
        },
        team: (parent: TeamMember, _args: any, _context: GraphQLContext) => {
            // Need team loader
            return null;
        },
        createdAt: (parent: TeamMember) => parent.createdAt.toISOString(),
        version: (parent: TeamMember) => parent.version,
    },

    Project: {
        teams: (parent: Project, _args: PaginationArgs, _context: GraphQLContext) => null,
    },

    Query: {
        team: (_parent: any, { id }: { id: string }, _context: GraphQLContext) => {
            return null;
        },
        teams: (_parent: any, { ids }: { ids?: string[] }, _context: GraphQLContext) => {
            return [];
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
