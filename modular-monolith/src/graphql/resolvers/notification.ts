import type { GraphQLContext } from '../context.ts';
import type { InternalNotification } from '../../modules/internal-notification';
import type { PaginationParams } from '../../types/pagination.ts';

export const notificationResolvers = {
    InternalNotification: {
        id: (parent: InternalNotification) => parent.id,
        userId: (parent: InternalNotification) => parent.userId,
        title: (parent: InternalNotification) => parent.title,
        message: (parent: InternalNotification) => parent.message,
        type: (parent: InternalNotification) => parent.type,
        metadata: (parent: InternalNotification) =>
            typeof parent.metadata === 'string'
                ? parent.metadata
                : JSON.stringify(parent.metadata),
        isRead: (parent: InternalNotification) => parent.isRead,
        createdAt: (parent: InternalNotification) =>
            parent.createdAt.toISOString(),
        readAt: (parent: InternalNotification) =>
            parent.readAt?.toISOString() || null,
    },

    Query: {
        notifications: (
            _parent: any,
            _args: PaginationParams,
            _context: GraphQLContext,
        ) => {
            return null;
        },
        unreadNotificationsCount: (
            _parent: any,
            _args: any,
            _context: GraphQLContext,
        ) => {
            return 0;
        },
    },

    Mutation: {
        markNotificationAsRead: (
            _parent: any,
            { id }: { id: string },
            _context: GraphQLContext,
        ) => {
            return true;
        },
        markAllNotificationsAsRead: (
            _parent: any,
            _args: any,
            _context: GraphQLContext,
        ) => {
            return true;
        },
    },
};
