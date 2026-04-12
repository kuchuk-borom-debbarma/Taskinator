import { redisSubscriber, INSTANCE_ID } from './index';
import { pubsub } from '../graphql/pubsub';
import { logger } from '../logger';

/**
 * The RealtimeRedisBridge listens specifically for payloads routed directly 
 * to this node's INSTANCE_ID from the RealtimeRouterConsumer.
 * 
 * When it receives a targeted payload, it immediately bridges that payload
 * straight into the local GraphQL PubSub, ensuring only clients connected 
 * to this specific instance receive the message.
 */
export const startRedisBridge = async () => {
    const channel = `instance:${INSTANCE_ID}`;
    
    await redisSubscriber.subscribe(channel, (err, count) => {
        if (err) {
            logger.error(`[Redis Bridge] Failed to subscribe to ${channel}: %s`, err.message);
            return;
        }
        logger.info(`[Redis Bridge] Subscribed to targeted local routing channel: ${channel}`);
    });

    redisSubscriber.on('message', (chan, message) => {
        if (chan !== channel) return;
        
        try {
            const { topic, payload } = JSON.parse(message);
            // Bridge the payload straight into the local active WebSockets/SSE connections
            pubsub.publish(topic, payload);
        } catch (err) {
            logger.error('[Redis Bridge] Failed to process targeted message: %s', err);
        }
    });
};
