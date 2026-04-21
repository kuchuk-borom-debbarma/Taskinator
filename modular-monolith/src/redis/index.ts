import os from 'node:os';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';

// Unique identifier for this specific node instance
export const INSTANCE_ID = `${os.hostname()}-${uuidv4().substring(0, 8)}`;

// Standard clients for the application
export const redisPublisher = new Redis(
    process.env.REDIS_URL || 'redis://localhost:6379',
);
export const redisSubscriber = new Redis(
    process.env.REDIS_URL || 'redis://localhost:6379',
);

redisPublisher.on('error', (err) =>
    logger.error('[Redis Publisher] Error:', err),
);
redisSubscriber.on('error', (err) =>
    logger.error('[Redis Subscriber] Error:', err),
);

export const stopRedis = async () => {
    await redisPublisher.quit();
    await redisSubscriber.quit();
};
