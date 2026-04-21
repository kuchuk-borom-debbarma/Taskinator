import type { GraphQLContext } from '../context.ts';

export const realtimeResolvers = {
    RealtimeEvent: {
        __resolveType(parent: any) {
            if (parent.userId && parent.title) return 'InternalNotification';
            return null;
        },
    },

    Subscription: {
        realtimeStream: {
            subscribe: (
                _parent: any,
                { projectId }: { projectId?: string },
                _context: GraphQLContext,
            ) => {
                return null; // Should return an AsyncIterable
            },
            resolve: (parent: any) => parent,
        },
    },
};
