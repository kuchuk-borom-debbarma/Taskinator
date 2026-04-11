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
          memberId
          parentTaskId
          materializedPath
          version
          createdBy
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

export const GET_TEAMS = gql`
  query GetTeams($projectId: ID!, $first: Int, $after: String) {
    teams(projectId: $projectId, first: $first, after: $after) {
      edges {
        node {
          id
          name
          projectId
          createdBy
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
