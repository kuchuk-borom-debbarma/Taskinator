import { pubsub } from '../pubsub';
import { logger } from '../../logger';
import { redisPublisher, INSTANCE_ID } from '../../redis/index.ts';
import { UnauthorizedError } from '../errors';
import type { GraphQLContext } from '../context';

/**
 * realtimeResolvers handles the unified event stream for Notification events.
 * It merges multiple pubsub subscriptions into a single channel for the client.
 */
export const realtimeResolvers = {
    RealtimeEvent: {
        __resolveType(obj: any) {
            if (obj.__typename) return obj.__typename;
            return null;
        },
    },
    Subscription: {
        realtimeStream: {
            subscribe: (
                _: any,
                { projectId }: any,
                context: GraphQLContext,
            ) => {
                const userId = context.userId;
                if (!userId) throw new UnauthorizedError();

                logger.info(
                    `[Realtime] Unified stream connection established for user: ${userId}, project: ${projectId || 'all'} on node: ${INSTANCE_ID}`,
                );

                // Register the routing in Redis
                redisPublisher
                    .sadd(`route:user:${userId}`, INSTANCE_ID)
                    .catch(console.error);
                if (projectId) {
                    redisPublisher
                        .sadd(`route:project:${projectId}`, INSTANCE_ID)
                        .catch(console.error);
                }

                return (async function* () {
                    const notifCreatedIter = pubsub.subscribe(
                        'notification_created',
                    );

                    // Helper to map and check next values
                    const iters = [
                        {
                            iter: notifCreatedIter,
                            type: 'notification_created',
                        },
                    ];

                    const nexts = iters.map(({ iter, type }) =>
                        (iter as any)
                            .next()
                            .then((res: any) => ({ res, type, iter })),
                    );

                    try {
                        while (true) {
                            const { res, type, iter } =
                                await Promise.race(nexts);
                            if (res.done) break;

                            const event = res.value;
                            let yieldValue: any = null;

                            // 1. Filtering & Mapping
                            if (type === 'notification_created') {
                                if (event.userId === userId) {
                                    yieldValue = {
                                        __typename: 'InternalNotification',
                                        ...event,
                                        createdAt:
                                            event.createdAt instanceof Date
                                                ? event.createdAt.toISOString()
                                                : event.createdAt,
                                    };
                                }
                            }

                            if (yieldValue) {
                                yield { realtimeStream: yieldValue };
                            }

                            // Queue up the next promise for the iterator that just yielded
                            const idx = iters.findIndex(
                                (it) => it.iter === iter,
                            );
                            nexts[idx] = (iter as any)
                                .next()
                                .then((res: any) => ({ res, type, iter }));
                        }
                    } finally {
                        logger.info(
                            `[Realtime] Unified stream connection closed for user: ${userId}`,
                        );

                        // Clean up routing table
                        redisPublisher
                            .srem(`route:user:${userId}`, INSTANCE_ID)
                            .catch(console.error);
                        if (projectId) {
                            redisPublisher
                                .srem(`route:project:${projectId}`, INSTANCE_ID)
                                .catch(console.error);
                        }
                    }
                })();
            },
        },
    },
};
