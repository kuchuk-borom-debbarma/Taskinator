import type { GraphQLContext } from '../context.ts';
import { pubsub } from '../pubsub';
import { logger } from '../../logger';

/**
 * realtimeResolvers handles the unified event stream for Task and Notification events.
 * It merges multiple pubsub subscriptions into a single channel for the client.
 */
export const realtimeResolvers = {
  RealtimeEvent: {
    __resolveType(obj: any) {
      if ('task' in obj && obj.task?.id) {
        // We yield { task } so types like TaskCreated and TaskUpdated match
        // But wait, our TaskEvent union expects TaskCreated/Updated types.
        // We'll wrap them in the generator.
      }
      if (obj.__typename) return obj.__typename;
      return null;
    },
  },
  Subscription: {
    realtimeStream: {
      subscribe: (_: any, { projectId }: any, context: GraphQLContext) => {
        const userId = context.userId;
        if (!userId) throw new Error('Unauthorized');

        logger.info(`[Realtime] Unified stream connection established for user: ${userId}, project: ${projectId || 'all'}`);

        return (async function* () {
          const taskCreatedIter = pubsub.subscribe('task_created');
          const taskUpdatedIter = pubsub.subscribe('task_updated');
          const taskDeletedIter = pubsub.subscribe('task_deleted');
          const notifCreatedIter = pubsub.subscribe('notification_created');

          // Helper to map and check next values
          const iters = [
            { iter: taskCreatedIter,  type: 'task_created' },
            { iter: taskUpdatedIter,  type: 'task_updated' },
            { iter: taskDeletedIter,  type: 'task_deleted' },
            { iter: notifCreatedIter, type: 'notification_created' },
          ];

          const nexts = iters.map(({ iter, type }) => 
            (iter as any).next().then((res: any) => ({ res, type, iter }))
          );

          try {
            while (true) {
              const { res, type, iter } = await Promise.race(nexts);
              if (res.done) break;

              const event = res.value;
              let yieldValue: any = null;

              // 1. Filtering & Mapping
              if (type === 'notification_created') {
                if (event.userId === userId) {
                  yieldValue = { 
                    __typename: 'InternalNotification', 
                    ...event,
                    createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt 
                  };
                }
              } else if (projectId && event.projectId === projectId) {
                // Task events
                if (type === 'task_created') {
                    yieldValue = { __typename: 'TaskCreated', task: event };
                } else if (type === 'task_updated') {
                    yieldValue = { __typename: 'TaskUpdated', task: event };
                } else if (type === 'task_deleted') {
                    yieldValue = { __typename: 'TaskDeleted', id: event.id, projectId: event.projectId };
                }
              }

              if (yieldValue) {
                yield { realtimeStream: yieldValue };
              }

              // Queue up the next promise for the iterator that just yielded
              const idx = iters.findIndex(it => it.iter === iter);
              nexts[idx] = (iter as any).next().then((res: any) => ({ res, type, iter }));
            }
          } finally {
            logger.info(`[Realtime] Unified stream connection closed for user: ${userId}`);
            // Cleanup: Close all iterators if possible (Yoga handles this usually)
          }
        })();
      },
    },
  },
};
