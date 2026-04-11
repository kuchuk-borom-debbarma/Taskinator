import { createPubSub } from 'graphql-yoga';

export type PubSubEvents = {
    'task_created': [{ id: string; projectId: string; title: string }];
    'task_updated': [{ id: string; projectId: string; version: number }];
    'task_deleted': [{ id: string; projectId: string }];
    'notification_created': [{ id: string; userId: string; title: string; message: string; type: string; metadata: any; isRead: boolean; createdAt: string }];
};

export const pubsub = createPubSub<PubSubEvents>();
