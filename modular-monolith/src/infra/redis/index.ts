import type { CachePort } from '../contracts/index.ts';
import { IoredisCacheProvider } from './adapters/IoredisCacheProvider.ts';

const createCacheProvider = (): CachePort => {
    const provider = process.env.CACHE_PROVIDER || 'ioredis';

    if (provider === 'ioredis') {
        return new IoredisCacheProvider(
            process.env.REDIS_URL || 'redis://localhost:6379',
        );
    }

    throw new Error(`Unsupported CACHE_PROVIDER "${provider}"`);
};

export const cacheProvider = createCacheProvider();

// Unique identifier for this specific node instance.
export const INSTANCE_ID = cacheProvider.instanceId;

export const getRedisPublisher = () => cacheProvider.getPublisher();

export const getRedisSubscriber = () => cacheProvider.getSubscriber();

export const stopRedis = async () => {
    await cacheProvider.destroy?.();
};
