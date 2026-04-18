import { internalNotificationService as notificationService } from '../../modules/internal-notification';
import { projectService } from '../../modules/project';
import { pubsub } from '../pubsub';
import { UnauthorizedError } from '../errors';
import { encodeCursor } from '../../utils/utils.ts';
import type { GraphQLContext } from '../context';

export const notificationResolvers = {
    InternalNotification: {
        createdAt: (n: any) =>
            n.createdAt instanceof Date
                ? n.createdAt.toISOString()
                : n.createdAt,
        readAt: (n: any) =>
            n.readAt instanceof Date ? n.readAt.toISOString() : n.readAt,
    },
    Query: {
        notifications: async (
            _: any,
            args: { first?: number; after?: string; last?: number; before?: string },
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            const { notifications, nextCursor, prevCursor } =
                await notificationService.getNotifications(context.userId, args);

            return {
                edges: notifications.map((n: any) => ({ 
                    node: n, 
                    cursor: encodeCursor(n.epochPrecision, n.id) 
                })),
                pageInfo: {
                    hasNextPage: !!nextCursor,
                    hasPreviousPage: !!prevCursor,
                    startCursor: prevCursor,
                    endCursor: nextCursor,
                },
            };
        },
        unreadNotificationsCount: async (
            _: any,
            __: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            return notificationService.getUnreadCount(context.userId);
        },
    },
    Mutation: {
        markNotificationAsRead: async (
            _: any,
            { id }: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            await notificationService.markAsRead(context.userId, id);
            return true;
        },
        markAllNotificationsAsRead: async (
            _: any,
            __: any,
            context: GraphQLContext,
        ) => {
            if (!context.userId) throw new UnauthorizedError();
            await notificationService.markAllAsRead(context.userId);
            return true;
        },
    },
};
