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
        PURGE_PROJECT_MEMBERS: 'project.aggregated.purge_project_members',
        REMOVE_MEMBER_FROM_PROJECT_TEAMS:
            'project.aggregated.remove_member_from_project_teams',
        UNASSIGN_MEMBER_FROM_PROJECT_TASKS:
            'project.aggregated.unassign_member_from_project_tasks',
        DELETE_PROJECT_MEMBERS: 'project.aggregated.delete_project_members',
        DELETE_PROJECT_TEAMS: 'project.aggregated.delete_project_teams',
        DELETE_PROJECT_TEAM_MEMBERS:
            'project.aggregated.delete_project_team_members',
        DELETE_PROJECT_TASKS: 'project.aggregated.delete_project_tasks',
        DELETE_PROJECT_TASK_LINKS:
            'project.aggregated.delete_project_task_links',
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
