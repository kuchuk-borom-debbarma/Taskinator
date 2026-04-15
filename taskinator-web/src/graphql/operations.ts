import { gql } from 'graphql-request';

export const GET_PROJECTS = gql`
  query GetProjects($first: Int, $after: String) {
    projects(first: $first, after: $after) {
      edges {
        node {
          id
          name
          description
          userId
          isOwner
          creator {
            id
            username
          }
          createdAt
          updatedAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      description
      userId
      isOwner
      creator {
        id
        username
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_TASKS = gql`
  query GetTasks($projectId: ID!, $first: Int, $after: String) {
    tasks(projectId: $projectId, first: $first, after: $after) {
      edges {
        node {
          id
          title
          description
          status
          projectId
          teamId
          team {
            id
            name
          }
          memberId
          assignee {
            id
            username
          }
          parentTaskId
          materializedPath
          version
          createdBy
          creator {
            id
            username
          }
          createdAt
          updatedAt

        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_WORKSPACE_DATA = gql`
  query GetWorkspaceData($projectId: ID!, $first: Int) {
    tasks(projectId: $projectId, first: $first) {
      edges {
        node {
          id
          title
          description
          status
          projectId
          teamId
          team {
            id
            name
          }
          memberId
          assignee {
            id
            username
          }
          parentTaskId
          materializedPath
          version
          createdBy
          creator {
            id
            username
          }
          createdAt
          updatedAt

        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    teams(projectId: $projectId, first: $first) {
      edges {
        node {
          id
          name
          projectId
          createdBy
          creator {
            id
            username
          }
          createdAt
          updatedAt
          version
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;


export const GET_TEAMS = gql`
  query GetTeams($projectId: ID!, $first: Int, $after: String) {
    teams(projectId: $projectId, first: $first, after: $after) {
      edges {
        node {
          id
          name
          projectId
          createdBy
          creator {
            id
            username
          }
          createdAt
          updatedAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($name: String!, $description: String) {
    createProject(name: $name, description: $description) {
      id
      name
    }
  }
`;

export const DELETE_PROJECTS = gql`
  mutation DeleteProjects($projectIds: [ID!]!) {
    deleteProjects(projectIds: $projectIds)
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $name: String, $description: String) {
    updateProject(id: $id, name: $name, description: $description) {
      id
      name
      description
      updatedAt
    }
  }
`;

export const CREATE_TASK = gql`
  mutation CreateTask($projectId: ID!, $title: String!, $description: String!, $teamId: ID, $parentTaskId: ID) {
    createTask(projectId: $projectId, title: $title, description: $description, teamId: $teamId, parentTaskId: $parentTaskId) {
      id
      title
    }
  }
`;

export const TASK_EVENT_SUBSCRIPTION = gql`
  subscription OnTaskEvent($projectId: ID!) {
    taskEvents(projectId: $projectId) {
      ... on TaskCreated {
        task {
          id
          title
        }
      }
      ... on TaskUpdated {
        task {
          id
          title
        }
      }
      ... on TaskDeleted {
        id
        projectId
      }
    }
  }
`;

export const GET_PROJECT_MEMBERS = gql`
  query GetProjectMembers($projectId: ID!, $first: Int, $after: String) {
    projectMembers(projectId: $projectId, first: $first, after: $after) {
      edges {
        node {
          id
          projectId
          userId
          user {
            id
            username
            email
          }
          createdAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_TEAM_MEMBERS = gql`
  query GetTeamMembers($projectId: ID!, $teamId: ID!, $first: Int, $after: String) {
    teamMembers(projectId: $projectId, teamId: $teamId, first: $first, after: $after) {
      edges {
        node {
          id
          teamId
          userId
          user {
            id
            username
            email
          }
          createdAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_AUTOMATIONS = gql`
  query GetAutomations($projectId: ID, $actorId: ID, $taskId: ID, $teamId: ID, $targetScope: String, $first: Int, $after: String) {
    automations(projectId: $projectId, actorId: $actorId, taskId: $taskId, teamId: $teamId, targetScope: $targetScope, first: $first, after: $after) {
      edges {
        node {
          id
          projectId
          actorId
          name
          targetScope
          taskId
          teamId
          rules
          isActive
          createdAt
          updatedAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($first: Int, $after: String) {
    notifications(first: $first, after: $after) {
      edges {
        node {
          id
          title
          message
          type
          metadata
          isRead
          createdAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_UNREAD_NOTIFICATIONS_COUNT = gql`
  query GetUnreadCount {
    unreadNotificationsCount
  }
`;

export const UPDATE_TASKS = gql`
  mutation UpdateTasks($projectId: ID!, $tasks: [UpdateTaskInput!]!) {
    updateTasks(projectId: $projectId, tasks: $tasks)
  }
`;

export const DELETE_TASKS = gql`
  mutation DeleteTasks($projectId: ID!, $taskIds: [ID!]!) {
    deleteTasks(projectId: $projectId, taskIds: $taskIds)
  }
`;

export const CREATE_TEAM = gql`
  mutation CreateTeam($projectId: ID!, $name: String!) {
    createTeam(projectId: $projectId, name: $name) {
      id
      name
    }
  }
`;

export const DELETE_TEAMS = gql`
  mutation DeleteTeams($projectId: ID!, $teamIds: [ID!]!) {
    deleteTeams(projectId: $projectId, teamIds: $teamIds)
  }
`;

export const ADD_PROJECT_MEMBERS = gql`
  mutation AddProjectMembers($projectId: ID!, $userIds: [String!]!) {
    addProjectMembers(projectId: $projectId, userIds: $userIds) {
      id
      userId
    }
  }
`;

export const REMOVE_PROJECT_MEMBERS = gql`
  mutation RemoveProjectMembers($projectId: ID!, $memberIds: [ID!]!) {
    removeProjectMembers(projectId: $projectId, memberIds: $memberIds)
  }
`;

export const ADD_TEAM_MEMBERS = gql`
  mutation AddTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [String!]!) {
    addTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {
      id
      userId
    }
  }
`;

export const REMOVE_TEAM_MEMBERS = gql`
  mutation RemoveTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [String!]!) {
    removeTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds)
  }
`;

export const ADD_AUTOMATION = gql`
  mutation AddAutomation($projectId: ID!, $name: String!, $targetScope: String!, $taskId: ID, $teamId: ID, $rules: String!, $isActive: Boolean) {
    addAutomation(projectId: $projectId, name: $name, targetScope: $targetScope, taskId: $taskId, teamId: $teamId, rules: $rules, isActive: $isActive) {
      id
      projectId
      actorId
      name
      targetScope
      taskId
      teamId
      rules
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_AUTOMATION = gql`
  mutation DeleteAutomation($automationId: ID!) {
    deleteAutomation(automationId: $automationId)
  }
`;

export const UPDATE_AUTOMATION = gql`
  mutation UpdateAutomation($automationId: ID!, $name: String, $targetScope: String, $taskId: ID, $teamId: ID, $rules: String, $isActive: Boolean) {
    updateAutomation(automationId: $automationId, name: $name, targetScope: $targetScope, taskId: $taskId, teamId: $teamId, rules: $rules, isActive: $isActive) {
      id
      projectId
      actorId
      name
      targetScope
      taskId
      teamId
      rules
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkRead($id: ID!) {
    markNotificationAsRead(id: $id)
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllRead {
    markAllNotificationsAsRead
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($search: String, $first: Int, $after: String) {
    searchUsers(search: $search, first: $first, after: $after) {
      edges {
        node {
          id
          username
          email
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const SEARCH_TEAM_USERS = gql`
  query SearchTeamUsers($projectId: ID!, $teamId: ID!, $search: String, $first: Int, $after: String) {
    searchTeamUsers(projectId: $projectId, teamId: $teamId, search: $search, first: $first, after: $after) {
      edges {
        node {
          id
          username
          email
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
