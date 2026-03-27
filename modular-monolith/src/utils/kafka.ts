import { v4 } from 'uuid';

export function buildKafkaMessage({
    key,
    type,
    source,
    data,
}: {
    key: string;
    type: string;
    source: string;
    data: unknown;
}) {
    const eventId = v4();

    return {
        key,
        headers: {
            eventType: type,
            eventId,
            source,
        },
        value: JSON.stringify({
            eventId,
            type,
            data,
        }),
        timestamp: Date.now().toString(),
    };
}

export const KAFKA_EVENTS = {
    PROJECT: {
        CREATED: 'PROJECT_CREATED',
        DELETED: 'PROJECT_DELETED',
    },
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
} as const;

export const KAFKA_TOPICS = {
    PROJECT: 'project-events',
    PROJECT_MEMBER: 'project-member-events',
    PROJECT_TEAM: 'project-team-events',
    PROJECT_TEAM_MEMBER: 'project-team-member-events',
} as const;
