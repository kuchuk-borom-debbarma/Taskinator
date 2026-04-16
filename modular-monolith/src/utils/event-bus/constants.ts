export const KAFKA_TOPICS = {
    PROJECT: 'project-events',
    PROJECT_MEMBER: 'project-member-events',
    PROJECT_TEAM: 'project-team-events',
    PROJECT_TEAM_MEMBER: 'project-team-member-events',
    PROJECT_TASK: 'project-task-events',
    AUTH: 'auth-events',
    NOTIFICATION: 'notification-events',
    AUTOMATION: 'automation-events',
} as const;

// Event type constants — values match exactly what the outbox SQL writes,
// so there's a single name end-to-end (no translation table needed).
export const KAFKA_EVENTS = {
    PROJECT: {
        CREATED: 'project.created',
        DELETED: 'project.deleted',
    },
    PROJECT_MEMBER: {
        ADDED: 'project.member.added',
        DELETED: 'project.member.deleted',
    },
    PROJECT_TEAM: {
        ADDED: 'project.team.created',
        DELETED: 'project.team.deleted',
    },
    PROJECT_TEAM_MEMBER: {
        ADDED: 'project.team.member.added',
        DELETED: 'project.team.member.deleted',
    },
    PROJECT_TASK: {
        CREATED: 'project.task.created',
        DELETED: 'project.task.deleted',
    },
    PROJECT_TASK_LINK: {
        CREATED: 'project.task_link.created',
        DELETED: 'project.task_link.deleted',
    },
    AUTH: {
        SIGNUP_STARTED: 'auth.signup.started',
        USER_CREATED: 'auth.user.created',
    },
    NOTIFICATION: {
        REQUESTED: 'notification.requested',
        CREATED: 'notification.created',
    },
    AUTOMATION: {
        TRIGGER: 'automation.trigger',
    },
} as const;

// Maps event type → Kafka topic (the actual broker topic name).
export const EVENT_TO_TOPIC: Record<string, string> = {
    'project.created': KAFKA_TOPICS.PROJECT,
    'project.deleted': KAFKA_TOPICS.PROJECT,
    'project.member.added': KAFKA_TOPICS.PROJECT_MEMBER,
    'project.member.deleted': KAFKA_TOPICS.PROJECT_MEMBER,
    'project.team.created': KAFKA_TOPICS.PROJECT_TEAM,
    'project.team.deleted': KAFKA_TOPICS.PROJECT_TEAM,
    'project.team.member.added': KAFKA_TOPICS.PROJECT_TEAM_MEMBER,
    'project.team.member.deleted': KAFKA_TOPICS.PROJECT_TEAM_MEMBER,
    'project.task.created': KAFKA_TOPICS.PROJECT_TASK,
    'project.task.deleted': KAFKA_TOPICS.PROJECT_TASK,
    'project.task_link.created': KAFKA_TOPICS.PROJECT_TASK,
    'project.task_link.deleted': KAFKA_TOPICS.PROJECT_TASK,
    'auth.signup.started': KAFKA_TOPICS.AUTH,
    'auth.user.created': KAFKA_TOPICS.AUTH,
    'notification.requested': KAFKA_TOPICS.NOTIFICATION,
    'notification.created': KAFKA_TOPICS.NOTIFICATION,
    'automation.trigger': KAFKA_TOPICS.AUTOMATION,
};
