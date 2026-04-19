import type { GraphQLContext } from '../context.ts';
import { authService } from '../../modules/auth';
import { resolveUser } from './helpers.ts';

export const authResolvers = {
    User: {
        id: (u: any) => u.id,
        username: async (u: any, _: any, context: GraphQLContext) => {
            const user = await resolveUser(u, context);
            return user?.username;
        },
        email: async (u: any, _: any, context: GraphQLContext) => {
            const user = await resolveUser(u, context);
            return user?.email;
        },
        projects: async (u: any, args: any, context: GraphQLContext) => {
            const { projectService } = await import('../../modules/project');
            const { projects, nextCursor, prevCursor } = await projectService.getProjects(
                u.id, // Target user
                args
            );
            const { encodeCursor } = await import('../../utils/utils.ts');
            return {
                edges: projects.map((p: any) => ({
                    node: p,
                    cursor: encodeCursor(p.epochPrecision, p.id),
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
        teams: async (u: any, args: any, context: GraphQLContext) => {
            const { teamService } = await import('../../modules/team');
            // We'll need a way to fetch teams for a specific user across projects
            // For now, if we are in a project context (passed via context), we use it
            // Otherwise, we might need a global search (TBD)
            const { teams, nextCursor, prevCursor } = await teamService.getTeams(
                context.userId!,
                '', // empty string for global? or needs change in service
                { ...args, memberId: u.id }
            );
            return {
                edges: teams.map((t: any) => ({ node: t, cursor: t.id })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
        assignedTasks: async (u: any, args: any, context: GraphQLContext) => {
            const { taskService } = await import('../../modules/task');
            const { tasks, nextCursor, prevCursor } = await taskService.getTasks(
                context.userId!,
                '', // global skip
                { ...args, memberId: u.id }
            );
            const { encodeCursor } = await import('../../utils/utils.ts');
            return {
                edges: tasks.map((t: any) => ({
                    node: t,
                    cursor: encodeCursor(t.epochPrecision, t.id),
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
    Query: {
        me: (_: any, __: any, context: GraphQLContext) => {
            if (!context.userId) return null;
            return {
                id: context.userId,
                username: 'Current User',
                email: 'user@taskinator.io',
            };
        },
        searchUsers: async (
            _: any,
            { search, first, after, last, before }: any,
            context: GraphQLContext,
        ) => {
            const { users, nextCursor, prevCursor } = await authService.searchUsers({
                search,
                first,
                after,
                last,
                before,
                actorId: context.userId,
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
};
