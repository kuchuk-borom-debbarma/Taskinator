import type { GraphQLContext } from '../context.ts';

interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export const notificationResolvers = {
    InternalNotification: {
        id: (n: any) => n.id,
        userId: (n: any) => n.userId,
        title: (n: any) => n.title,
        message: (n: any) => n.message,
        type: (n: any) => n.type,
        metadata: (n: any) => n.metadata,
        isRead: (n: any) => n.isRead,
        createdAt: (n: any) => n.createdAt,
        readAt: (n: any) => n.readAt,
    },

    Query: {
        notifications: (_: any, args: PaginationArgs, context: GraphQLContext) => {
            return null;
        },
        unreadNotificationsCount: (_: any, __: any, context: GraphQLContext) => {
            return 0;
        },
    },

    Mutation: {
        markNotificationAsRead: (_: any, { id }: { id: string }, context: GraphQLContext) => {
            return true;
        },
        markAllNotificationsAsRead: (_: any, __: any, context: GraphQLContext) => {
            return true;
        },
    },
};
