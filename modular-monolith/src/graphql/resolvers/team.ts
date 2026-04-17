import type { GraphQLContext } from '../context.ts';
import { teamService } from '../../modules/team';
import { resolveTeam, buildRef } from './helpers.ts';

export const teamResolvers = {
    Team: {
        id: (t: any) => t.id,
        projectId: (t: any) => t.projectId,
        createdBy: (t: any) => t.createdBy,
        name: async (t: any, _: any, context: GraphQLContext) => {
            const team = await resolveTeam(t, context);
            return team?.name;
        },
        createdAt: async (t: any) => {
            const team = await resolveTeam(t, null as any);
            const date = team?.createdAt ?? t.createdAt;
            return date instanceof Date ? date.toISOString() : date;
        },
        updatedAt: async (t: any) => {
            const team = await resolveTeam(t, null as any);
            const date = team?.updatedAt ?? t.updatedAt;
            return date instanceof Date ? date.toISOString() : date;
        },
        creator: (t: any) => buildRef(t.createdBy, 'User'),
        project: (t: any) => buildRef(t.projectId, 'Project'),
        automations: (t: any, _: any, context: GraphQLContext) =>
            context.loaders.teamAutomations.load(t.id),
    },
    TeamMember: {
        id: (m: any) => m.id,
        teamId: (m: any) => m.teamId,
        userId: (m: any) => m.userId,
        createdAt: (m: any) =>
            m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
        user: (m: any) => buildRef(m.userId, 'User'),
        team: (m: any) => buildRef(m.teamId, 'Team'),
    },
    Query: {
        teams: async (
            _: any,
            { projectId, first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            const { teams, nextCursor, prevCursor } = await teamService.getTeams(
                context.userId,
                projectId,
                { first, after, last, before },
            );
            return {
                edges: teams.map((t) => ({ node: t, cursor: t.id })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
        teamMembers: async (
            _: any,
            { projectId, teamId, first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            const { members, nextCursor, prevCursor } = await teamService.getTeamMembers(
                context.userId,
                projectId,
                teamId,
                { first, after, last, before },
            );
            return {
                edges: members.map((m) => ({ node: m, cursor: m.id })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
        searchTeamUsers: async (
            _: any,
            { projectId, teamId, search, first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            const { users, nextCursor, prevCursor } = await teamService.searchTeamUsers({
                actorId: context.userId!,
                projectId,
                teamId,
                search,
                first,
                after,
                last,
                before,
            });
            return {
                edges: users.map((u) => ({ node: u, cursor: u.id })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
    },
    Mutation: {
        createTeam: async (
            _: any,
            { projectId, name }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            const teams = await teamService.createTeams({
                userId: context.userId,
                projectId,
                teams: [name],
            });
            return teams[0];
        },
        deleteTeams: async (
            _: any,
            { projectId, teamIds }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            return teamService.deleteTeams({
                userId: context.userId,
                projectId,
                teamIds,
            });
        },
        addTeamMembers: async (
            _: any,
            { projectId, teamId, userIds }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new Error('Unauthorized');
            return teamService.addTeamMembers({
                userId: context.userId,
                projectId,
                teamId,
                members: userIds,
            });
        },
        removeTeamMembers: async (
            _: any,
            { projectId, teamId, userIds }: any,
            context: GraphQLContext,
        ) => {
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
