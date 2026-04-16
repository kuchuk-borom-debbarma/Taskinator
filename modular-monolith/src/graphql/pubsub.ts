import { createPubSub } from 'graphql-yoga';

export type PubSubEvents = {
    notification_created: [
        {
            id: string;
            userId: string;
            title: string;
            message: string;
            type: string;
            metadata: any;
            isRead: boolean;
            createdAt: string;
        },
    ];
};

export const pubsub = createPubSub<PubSubEvents>();
