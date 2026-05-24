import os from 'node:os';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import type { CachePort } from '../../contracts/index.ts';
import { logger } from '../../logger/index.ts';

export class IoredisCacheProvider implements CachePort<Redis> {
    readonly name = 'ioredis';
    readonly instanceId = `${os.hostname()}-${uuidv4().substring(0, 8)}`;

    private publisher: Redis | null = null;
    private subscriber: Redis | null = null;

    constructor(private readonly redisUrl: string) {}

    getPublisher() {
        if (!this.publisher || this.publisher.status === 'end') {
            this.publisher = this.createClient('Publisher');
        }
        return this.publisher;
    }

    getSubscriber() {
        if (!this.subscriber || this.subscriber.status === 'end') {
            this.subscriber = this.createClient('Subscriber');
        }
        return this.subscriber;
    }

    async destroy() {
        const promises = [];
        if (this.publisher && this.publisher.status !== 'end') {
            promises.push(this.publisher.quit());
        }
        if (this.subscriber && this.subscriber.status !== 'end') {
            promises.push(this.subscriber.quit());
        }
        await Promise.all(promises);
        this.publisher = null;
        this.subscriber = null;
    }

    private createClient(name: string) {
        const client = new Redis(this.redisUrl, {
            maxRetriesPerRequest: 20,
        });
        client.on('error', (err) =>
            logger.error(`[Redis ${name}] Error:`, err),
        );
        return client;
    }
}
