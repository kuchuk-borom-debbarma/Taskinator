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
        CHANGE_USER_PROJECT_COUNT:
            'project.aggregated.change_user_project_count',
        CHANGE_PROJECT_MEMBER_COUNT:
            'project.aggregated.change_project_member_count',
        REMOVE_PROJECT_MEMBER: 'project.aggregated.remove_project_member',
        REMOVE_PROJECT_TEAM_MEMBER:
            'project.aggregated.remove_project_team_member',
        UNASSIGN_PROJECT_TASK_MEMBER:
            'project.aggregated.unassign_project_task_member',
        DELETE_PROJECT_MEMBER: 'project.aggregated.delete_project_member',
        DELETE_PROJECT_TEAM: 'project.aggregated.delete_project_team',
        DELETE_PROJECT_TEAM_MEMBER:
            'project.aggregated.delete_project_team_member',
        DELETE_PROJECT_TASK: 'project.aggregated.delete_project_task',
        DELETE_PROJECT_TASK_LINK: 'project.aggregated.delete_project_task_link',
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
        DIRECT_LINK_COUNTS_CHANGED:
            'task.aggregated.direct_link_counts_changed',
        REACHABILITY_EXPAND: 'task.aggregated.reachability_expand',
        MEMBERS_CHANGED: 'task.aggregated.members_changed',
        DELETED: 'task.aggregated.deleted',
    },
} as const;
