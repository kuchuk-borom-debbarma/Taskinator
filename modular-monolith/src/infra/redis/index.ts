import os from 'node:os';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';

// Unique identifier for this specific node instance
export const INSTANCE_ID = `${os.hostname()}-${uuidv4().substring(0, 8)}`;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

const createClient = (name: string) => {
    const client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 20,
    });
    client.on('error', (err) => logger.error(`[Redis ${name}] Error:`, err));
    return client;
};

export const getRedisPublisher = () => {
    if (!publisher || publisher.status === 'end') {
        publisher = createClient('Publisher');
    }
    return publisher;
};

export const getRedisSubscriber = () => {
    if (!subscriber || subscriber.status === 'end') {
        subscriber = createClient('Subscriber');
    }
    return subscriber;
};

/**
 * Cleanly shuts down Redis connections.
 */
export const stopRedis = async () => {
    const promises = [];
    if (publisher && publisher.status !== 'end')
        promises.push(publisher.quit());
    if (subscriber && subscriber.status !== 'end')
        promises.push(subscriber.quit());
    await Promise.all(promises);
    publisher = null;
    subscriber = null;
};
