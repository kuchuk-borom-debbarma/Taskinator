import {Kafka, type Producer, type Consumer} from 'kafkajs';
import {EventEmitter} from 'events';
import {v4 as uuid} from 'uuid';
import {db} from '../database';
import {getTimeString} from './utils';

// --- 1. Constants & Types ---
export const KAFKA_TOPICS = {
    PROJECT: 'project-events',
    PROJECT_MEMBER: 'project-member-events',
    PROJECT_TEAM: 'project-team-events',
    PROJECT_TEAM_MEMBER: 'project-team-member-events',
    PROJECT_TASK: 'project-task-events',
    PROJECT_TASK_TRIGGER: "project-task-trigger-events"
} as const;

export const KAFKA_EVENTS = {
    PROJECT: {CREATED: 'PROJECT_CREATED', DELETED: 'PROJECT_DELETED'},
    PROJECT_MEMBER: {
        ADDED: 'PROJECT_MEMBER_ADDED',
        DELETED: 'PROJECT_MEMBER_DELETED',
    },
    PROJECT_TEAM: {
        ADDED: 'PROJECT_TEAM_ADDED',
        DELETED: 'PROJECT_TEAM_DELETED',
    },
    PROJECT_TEAM_MEMBER: {
        ADDED: 'PROJECT_TEAM_MEMBER_ADDED',
        DELETED: 'PROJECT_TEAM_MEMBER_DELETED',
    },
    PROJECT_TASK: {
        CREATED: 'PROJECT_TASK_CREATED',
        UPDATED: 'PROJECT_TASK_UPDATED',
        DELETED: 'PROJECT_TASK_DELETED',
    },
    PROJECT_TASK_TRIGGER: {
        TRIGGER: 'PROJECT_TASK_TRIGGER',
    }
} as const;

/** Mapping of Event Types to Topics for automatic routing. */
const EVENT_TO_TOPIC: Record<string, string> = {
    [KAFKA_EVENTS.PROJECT.CREATED]: KAFKA_TOPICS.PROJECT,
    [KAFKA_EVENTS.PROJECT.DELETED]: KAFKA_TOPICS.PROJECT,
    [KAFKA_EVENTS.PROJECT_MEMBER.ADDED]: KAFKA_TOPICS.PROJECT_MEMBER,
    [KAFKA_EVENTS.PROJECT_MEMBER.DELETED]: KAFKA_TOPICS.PROJECT_MEMBER,
    [KAFKA_EVENTS.PROJECT_TEAM.ADDED]: KAFKA_TOPICS.PROJECT_TEAM,
    [KAFKA_EVENTS.PROJECT_TEAM.DELETED]: KAFKA_TOPICS.PROJECT_TEAM,
    [KAFKA_EVENTS.PROJECT_TEAM_MEMBER.ADDED]: KAFKA_TOPICS.PROJECT_TEAM_MEMBER,
    [KAFKA_EVENTS.PROJECT_TEAM_MEMBER.DELETED]:
    KAFKA_TOPICS.PROJECT_TEAM_MEMBER,
    [KAFKA_EVENTS.PROJECT_TASK.CREATED]: KAFKA_TOPICS.PROJECT_TASK,
    [KAFKA_EVENTS.PROJECT_TASK.UPDATED]: KAFKA_TOPICS.PROJECT_TASK,
    [KAFKA_EVENTS.PROJECT_TASK.DELETED]: KAFKA_TOPICS.PROJECT_TASK,
    [KAFKA_EVENTS.PROJECT_TASK_TRIGGER.TRIGGER]:
    KAFKA_TOPICS.PROJECT_TASK_TRIGGER,
};

export interface DomainEvent<T = any> {
    eventId: string;
    type: string;
    key: string;
    data: T;
    timestamp: string;
}

// --- 2. Interface ---
export interface Bus {
    /**
     * Publish one or more events. Routing to topics is handled automatically based on type.
     */
    publish(
        type: string,
        payload: { key: string; data: any } | Array<{ key: string; data: any }>,
    ): Promise<void>;

    /**
     * Subscribe to multiple event types within a consumer group.
     * Idempotency is handled automatically using the eventId.
     */
    subscribe(
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
    ): Promise<void>;

    init(): Promise<void>;

    destroy(): Promise<void>;

    // Legacy support for manual topic/event management
    emit(topic: string, event: DomainEvent | DomainEvent[]): Promise<void>;

    on(
        topic: string,
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
    ): Promise<void>;
}

// --- 3. Helpers ---
export function createEvent(type: string, key: string, data: any): DomainEvent {
    return {
        eventId: uuid(),
        type,
        key,
        data,
        timestamp: getTimeString(),
    };
}

async function withIdempotency(
    events: DomainEvent[],
    groupId: string,
    handler: (unprocessed: DomainEvent[]) => Promise<void>,
) {
    if (events.length === 0) return;
    await db.transaction().execute(async (trx) => {
        const results = await trx
            .insertInto('processed_event')
            .values(
                events.map((e) => ({
                    event_id: e.eventId,
                    consumer_group: groupId,
                    processed_at: getTimeString(),
                })),
            )
            .onConflict((oc) => oc.doNothing())
            .returning('event_id')
            .execute();

        const processedIds = new Set(results.map((r) => r.event_id));
        const unprocessed = events.filter((e) => processedIds.has(e.eventId));

        if (unprocessed.length > 0) {
            await handler(unprocessed);
        }
    });
}

// --- 4. Implementations ---
class MemoryBus implements Bus {
    private emitter = new EventEmitter();

    async init() {
    }

    async destroy() {
        this.emitter.removeAllListeners();
    }

    async publish(
        type: string,
        payload: { key: string; data: any } | Array<{ key: string; data: any }>,
    ) {
        const items = Array.isArray(payload) ? payload : [payload];
        const topic = EVENT_TO_TOPIC[type];
        if (!topic) throw new Error(`Unknown event type: ${type}`);
        const events = items.map((i) => createEvent(type, i.key, i.data));
        await this.emit(topic, events);
    }

    async subscribe(
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
    ) {
        const topicsToHandlers: Record<
            string,
            Record<string, (data: any) => Promise<void>>
        > = {};
        for (const [type, handler] of Object.entries(handlers)) {
            const topic = EVENT_TO_TOPIC[type];
            if (!topic) continue;
            topicsToHandlers[topic] = topicsToHandlers[topic] || {};
            topicsToHandlers[topic][type] = handler;
        }
        for (const [topic, topicHandlers] of Object.entries(topicsToHandlers)) {
            await this.on(topic, groupId, topicHandlers);
        }
    }

    async emit(topic: string, event: DomainEvent | DomainEvent[]) {
        const events = Array.isArray(event) ? event : [event];
        for (const e of events) {
            setTimeout(
                () => this.emitter.emit(`${topic}:${e.type}`, e.data),
                10,
            );
        }
    }

    async on(
        topic: string,
        _groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
    ) {
        for (const [type, handler] of Object.entries(handlers)) {
            this.emitter.on(`${topic}:${type}`, handler);
        }
    }
}

class KafkaBus implements Bus {
    private kafka = new Kafka({
        clientId: 'taskinator-v2',
        brokers: ['localhost:9092'],
    });
    private producer: Producer;
    private consumers: Consumer[] = [];

    constructor() {
        this.producer = this.kafka.producer({idempotent: true});
    }

    async init() {
        await this.producer.connect();
    }

    async destroy() {
        await this.producer.disconnect();
        for (const c of this.consumers) await c.disconnect();
    }

    async publish(
        type: string,
        payload: { key: string; data: any } | Array<{ key: string; data: any }>,
    ) {
        const items = Array.isArray(payload) ? payload : [payload];
        const topic = EVENT_TO_TOPIC[type];
        if (!topic) throw new Error(`Unknown event type: ${type}`);
        const events = items.map((i) => createEvent(type, i.key, i.data));
        await this.emit(topic, events);
    }

    async subscribe(
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
    ) {
        const topicsToHandlers: Record<
            string,
            Record<string, (data: any) => Promise<void>>
        > = {};
        for (const [type, handler] of Object.entries(handlers)) {
            const topic = EVENT_TO_TOPIC[type];
            if (!topic) continue;
            topicsToHandlers[topic] = topicsToHandlers[topic] || {};
            topicsToHandlers[topic][type] = handler;
        }
        for (const [topic, topicHandlers] of Object.entries(topicsToHandlers)) {
            await this.on(topic, groupId, topicHandlers);
        }
    }

    async emit(topic: string, event: DomainEvent | DomainEvent[]) {
        const events = Array.isArray(event) ? event : [event];
        await this.producer.send({
            topic,
            messages: events.map((e) => ({
                key: e.key,
                value: JSON.stringify(e),
            })),
        });
    }

    async on(
        topic: string,
        groupId: string,
        handlers: Record<string, (data: any) => Promise<void>>,
    ) {
        const consumer = this.kafka.consumer({groupId});
        await consumer.connect();
        await consumer.subscribe({topic, fromBeginning: false});
        await consumer.run({
            eachBatch: async ({
                                  batch,
                                  isRunning,
                                  isStale,
                                  heartbeat,
                                  resolveOffset,
                              }) => {
                const allEvents: DomainEvent[] = batch.messages
                    .map((m) => JSON.parse(m.value?.toString() || '{}'))
                    .filter((e) => handlers[e.type]);

                await withIdempotency(
                    allEvents,
                    groupId,
                    async (unprocessed) => {
                        for (const e of unprocessed) {
                            if (!isRunning() || isStale()) break;
                            const handler = handlers[e.type];
                            if (handler) await handler(e.data);
                        }
                    },
                );
                for (const m of batch.messages) resolveOffset(m.offset);
                await heartbeat();
            },
        });
        this.consumers.push(consumer);
    }
}

export const eventBus: Bus =
    process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_BUS === 'true'
        ? new MemoryBus()
        : new KafkaBus();
