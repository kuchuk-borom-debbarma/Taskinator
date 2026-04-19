import type { GraphQLContext } from '../context.ts';

export const realtimeResolvers = {
    RealtimeEvent: {
        __resolveType(obj: any) {
            if (obj.userId && obj.title) return 'InternalNotification';
            return null;
        },
    },

    Subscription: {
        realtimeStream: {
            subscribe: (_: any, { projectId }: { projectId?: string }, context: GraphQLContext) => {
                return null; // Should return an AsyncIterable
            },
            resolve: (payload: any) => payload,
        },
    },
};
