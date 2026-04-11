import type { GraphQLContext } from '../context.ts';
import { internalNotificationService as notificationService } from '../../modules/internal-notification';
import { pubsub } from '../pubsub';

export const notificationResolvers = {
  InternalNotification: {
    createdAt: (n: any) => (n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt),
    readAt: (n: any) => (n.readAt instanceof Date ? n.readAt.toISOString() : n.readAt),
  },
  Query: {
    notifications: async (_: any, args: { first?: number; after?: string }, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      const { notifications, nextCursor } = await notificationService.getNotifications(context.userId, {
        limit: args.first,
        cursor: args.after,
      });

      return {
        edges: notifications.map((n: any) => ({
          node: { ...n, metadata: n.metadata ? JSON.stringify(n.metadata) : null },
          cursor: `${n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt}|${n.id}`,
        })),
        pageInfo: {
          hasNextPage: !!nextCursor,
          endCursor: nextCursor,
          hasPreviousPage: false,
        },
      };
    },
    unreadNotificationsCount: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      return notificationService.getUnreadCount(context.userId);
    },
  },
  Mutation: {
    markNotificationAsRead: async (_: any, { id }: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      await notificationService.markAsRead(context.userId, id);
      return true;
    },
    markAllNotificationsAsRead: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.userId) throw new Error('Unauthorized');
      await notificationService.markAllAsRead(context.userId);
      return true;
    },
  },

};
