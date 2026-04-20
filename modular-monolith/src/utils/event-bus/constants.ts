export const KAFKA_TOPICS = {
    PROJECT: 'project-events',
    AUTH: 'auth-events',
    PROJECT_AGGREGATED: 'project-aggregated-events',
} as const;

// Event type constants — values match exactly what the outbox SQL writes,
// so there's a single name end-to-end (no translation table needed).
export const KAFKA_EVENTS = {
    PROJECT: {
        CREATED: 'project.created',
        DELETED: 'project.deleted',
    },
    AUTH: {
        SIGNUP_STARTED: 'auth.signup.started',
        USER_CREATED: 'auth.user.created',
    },
    PROJECT_AGGREGATED: {
        COUNTS_CHANGED: 'project.aggregated.counts_changed',
    },
} as const;

// Maps event type → Kafka topic (the actual broker topic name).
export const EVENT_TO_TOPIC: Record<string, string> = {
    'project.created': KAFKA_TOPICS.PROJECT,
    'project.deleted': KAFKA_TOPICS.PROJECT,
    'auth.signup.started': KAFKA_TOPICS.AUTH,
    'auth.user.created': KAFKA_TOPICS.AUTH,
    'project.aggregated.counts_changed': KAFKA_TOPICS.PROJECT_AGGREGATED,
};
