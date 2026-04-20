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
        DELETED: 'project.aggregated.deleted',
    },
} as const;
