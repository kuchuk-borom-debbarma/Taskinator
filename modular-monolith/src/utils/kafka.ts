import { v4 } from 'uuid';

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
    PROJECT_TASK: {
        CREATED: 'PROJECT_TASK_CREATED',
        UPDATED: 'PROJECT_TASK_UPDATED',
        DELETED: 'PROJECT_TASK_DELETED',
    },
} as const;

export const KAFKA_TOPICS = {
    PROJECT: 'project-events',
    PROJECT_MEMBER: 'project-member-events',
    PROJECT_TEAM: 'project-team-events',
    PROJECT_TEAM_MEMBER: 'project-team-member-events',
    PROJECT_TASK: 'project-task-events',
} as const;

export interface DomainEvent<T = any> {
    eventId: string;
    type: string;
    key: string;
    data: T;
    timestamp: string;
}

/**
 * Creates a clean event object. No JSON nesting.
 */
export function createEvent(type: string, key: string, data: any): DomainEvent {
    return {
        eventId: v4(),
        type,
        key,
        data,
        timestamp: new Date().toISOString(),
    };
}
