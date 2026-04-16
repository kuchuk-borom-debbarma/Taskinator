import type { GraphQLContext } from '../context.ts';
import { authService } from '../../modules/auth';

export const authResolvers = {
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
