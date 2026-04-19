import type { GraphQLContext } from '../context.ts';
import { teamService } from '../../modules/team';
import { resolveTeam, buildRef } from './helpers.ts';
import { UnauthorizedError } from '../errors';
import { encodeCursor } from '../../utils/utils.ts';

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

        // Connections
        members: async (t: any, args: any, context: GraphQLContext) => {
            const { members, nextCursor, prevCursor } = await teamService.getTeamMembers(
                context.userId!,
                t.projectId,
                t.id,
                args
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
        tasks: async (t: any, args: any, context: GraphQLContext) => {
            const { tasks, nextCursor, prevCursor } = await (await import('../../modules/task')).taskService.getTasks(
                context.userId!,
                t.projectId,
                { ...args, teamId: t.id }
            );
            return {
                edges: tasks.map((tk: any) => ({
                    node: tk,
                    cursor: encodeCursor(tk.epochPrecision, tk.id),
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
        teams: async (_: any, { projectId, memberId, ...args }: any, context: GraphQLContext) => {
            if (!context.userId) throw new UnauthorizedError();
            const { teams, nextCursor, prevCursor } = await teamService.getTeams(
                context.userId,
                projectId,
                { ...args, memberId },
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
            if (!context.userId) throw new UnauthorizedError();
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
            if (!context.userId) throw new UnauthorizedError();
            const team = await teamService.createTeams({
                userId: context.userId,
                projectId,
                teams: [name],
            });
            return {
                success: true,
                team: team[0],
            };
        },
        deleteTeams: async (
            _: any,
            { projectId, teamIds }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            await teamService.deleteTeams({
                projectId,
                teamIds,
                userId: context.userId,
            });
            return {
                success: true,
                deletedCount: teamIds.length,
                project: { id: projectId },
            };
        },
        addTeamMembers: async (
            _: any,
            { projectId, teamId, userIds }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            await teamService.addTeamMembers({
                projectId,
                teamId,
                members: userIds,
                userId: context.userId,
            });
            return {
                success: true,
                team: { id: teamId },
            };
        },
        removeTeamMembers: async (
            _: any,
            { projectId, teamId, userIds }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return teamService.deleteTeamMembers({
                userId: context.userId,
                projectId,
                teamId,
                members: userIds,
            });
        },
    },
};
