export const KAFKA_TOPICS = {
    PROJECT: 'project-events',
    PROJECT_MEMBER: 'project-member-events',
    PROJECT_TEAM: 'project-team-events',
    PROJECT_TEAM_MEMBER: 'project-team-member-events',
    PROJECT_TASK: 'project-task-events',
    PROJECT_TASK_TRIGGER: 'project-task-trigger-events',
    AUTH: 'auth-events',
    NOTIFICATION: 'notification-events',
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
        UPDATED: 'project.task.updated',
        DELETED: 'project.task.deleted',
        PARENT_DELETED: 'project.task.parent.deleted',
        CHILDREN_DELETED: 'project.task.children.deleted',
    },
    PROJECT_TASK_TRIGGER: {
        TRIGGER: 'project.task.trigger',
        DELETED: 'project.task.trigger.deleted',
    },
    AUTH: {
        SIGNUP_STARTED: 'auth.signup.started',
        USER_CREATED: 'auth.user.created',
    },
    NOTIFICATION: {
        REQUESTED: 'notification.requested',
        CREATED: 'notification.created',
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
    'project.task.updated': KAFKA_TOPICS.PROJECT_TASK,
    'project.task.deleted': KAFKA_TOPICS.PROJECT_TASK,
    'project.task.parent.deleted': KAFKA_TOPICS.PROJECT_TASK,
    'project.task.children.deleted': KAFKA_TOPICS.PROJECT_TASK,
    'project.task.trigger': KAFKA_TOPICS.PROJECT_TASK_TRIGGER,
    'project.task.trigger.deleted': KAFKA_TOPICS.PROJECT_TASK_TRIGGER,
    'auth.signup.started': KAFKA_TOPICS.AUTH,
    'auth.user.created': KAFKA_TOPICS.AUTH,
    'notification.requested': KAFKA_TOPICS.NOTIFICATION,
    'notification.created': KAFKA_TOPICS.NOTIFICATION,
};
