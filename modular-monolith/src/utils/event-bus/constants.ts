export const KAFKA_TOPICS = {
    PROJECT: 'project-events',
    TEAM: 'team-events',
    AUTH: 'auth-events',
    PROJECT_AGGREGATED: 'project-aggregated-events',
    TEAM_AGGREGATED: 'team-aggregated-events',
    TASK: 'task-events',
    TASK_AGGREGATED: 'task-aggregated-events',
} as const;

// Event type constants — values match exactly what the outbox SQL writes,
// so there's a single name end-to-end (no translation table needed).
export const KAFKA_EVENTS = {
    PROJECT: {
        CREATED: 'project.created',
        DELETED: 'project.deleted',
        MEMBERS_ADDED: 'project.members_added',
        MEMBERS_REMOVED: 'project.members_removed',
    },
    TEAM: {
        CREATED: 'team.created',
        DELETED: 'team.deleted',
        MEMBERS_ADDED: 'team.members_added',
        MEMBERS_REMOVED: 'team.members_removed',
    },
    AUTH: {
        SIGNUP_STARTED: 'auth.signup.started',
        USER_CREATED: 'auth.user.created',
    },
    PROJECT_AGGREGATED: {
        COUNTS_CHANGED: 'project.aggregated.counts_changed',
        MEMBER_COUNTS_CHANGED: 'project.aggregated.member_counts_changed',
        MEMBER_REMOVED: 'project.aggregated.member_removed',
        DELETED: 'project.aggregated.deleted',
    },
    TEAM_AGGREGATED: {
        PROJECT_TEAM_COUNTS_CHANGED:
            'team.aggregated.project_team_counts_changed',
        TEAM_MEMBER_COUNTS_CHANGED:
            'team.aggregated.team_member_counts_changed',
        DELETED: 'team.aggregated.deleted',
        MEMBER_REMOVED: 'team.aggregated.member_removed',
    },
    TASK: {
        CREATED: 'task.created',
        UPDATED: 'task.updated',
        DELETED: 'task.deleted',
    },
    TASK_LINK: {
        CREATED: 'task_link.created',
        UPDATED: 'task_link.updated',
        DELETED: 'task_link.deleted',
    },
    TASK_AGGREGATED: {
        COUNTS_CHANGED: 'task.aggregated.counts_changed',
        LINK_COUNTS_CHANGED: 'task.aggregated.link_counts_changed',
        MEMBERS_CHANGED: 'task.aggregated.members_changed',
        DELETED: 'task.aggregated.deleted',
        LINKS_CHANGED: 'task.aggregated.links_changed',
    },
} as const;
