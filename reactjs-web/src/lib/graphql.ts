export const GET_PROJECTS = `
  query GetProjects($first: Int, $after: String) {
    projects(first: $first, after: $after) {
      edges {
        node {
          id
          name
          description
          userId
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

export const GET_TEAMS = `
  query GetTeams($projectId: ID!, $first: Int) {
    teams(projectId: $projectId, first: $first) {
      edges {
        node {
          id
          name
          projectId
        }
      }
    }
  }
`;

export const GET_TASKS = `
  query GetTasks($projectId: ID!, $first: Int, $after: String) {
    tasks(projectId: $projectId, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          title
          description
          status
          projectId
          teamId
          team { id name projectId }
          memberId
          assignee { id username email }
          createdBy
          creator { id username email }
          createdAt
          updatedAt
          version
          links {
            id
            sourceTaskId
            targetTaskId
            label
            createdAt
          }
          story {
            id
            originTaskId
            terminalTaskId
            pathTaskIds
            pathLinkIds
            pathLinkLabels
            depth
            createdAt
            pathTasks {
              id
              title
              status
              projectId
              teamId
              team { id name projectId }
              memberId
              assignee { id username email }
              createdBy
              createdAt
              updatedAt
              version
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const GET_TASK = `
  query GetTask($projectId: ID!, $id: ID!) {
    task(projectId: $projectId, id: $id) {
      id
      title
      description
      status
      projectId
      teamId
      team { id name projectId }
      memberId
      assignee { id username email }
      createdBy
      creator { id username email }
      createdAt
      updatedAt
      version
      links {
        id
        sourceTaskId
        targetTaskId
        label
        createdAt
      }
      story {
        id
        originTaskId
        terminalTaskId
        pathTaskIds
        pathLinkIds
        pathLinkLabels
        depth
        createdAt
        pathTasks {
          id
          title
          status
          projectId
          teamId
          team { id name projectId }
          memberId
          assignee { id username email }
          createdBy
          createdAt
          updatedAt
          version
        }
      }
    }
  }
`;

export const GET_TASK_NETWORK = `
  query GetTaskNetwork($projectId: ID!, $taskId: ID!, $depth: Int, $limit: Int) {
    taskNetwork(projectId: $projectId, taskId: $taskId, depth: $depth, limit: $limit) {
      incoming {
        id
        originTaskId
        terminalTaskId
        pathTaskIds
        pathLinkIds
        pathLinkLabels
        depth
        createdAt
        pathTasks {
          id
          title
          status
          projectId
          teamId
          team { id name projectId }
          memberId
          assignee { id username email }
          createdBy
          createdAt
          updatedAt
          version
        }
      }
      outgoing {
        id
        originTaskId
        terminalTaskId
        pathTaskIds
        pathLinkIds
        pathLinkLabels
        depth
        createdAt
        pathTasks {
          id
          title
          status
          projectId
          teamId
          team { id name projectId }
          memberId
          assignee { id username email }
          createdBy
          createdAt
          updatedAt
          version
        }
      }
    }
  }
`;

export const CREATE_PROJECT = `
  mutation CreateProject($name: String!, $description: String) {
    createProject(name: $name, description: $description) {
      id
      name
      description
      userId
      createdAt
    }
  }
`;

export const CREATE_TEAM = `
  mutation CreateTeam($projectId: ID!, $name: String!) {
    createTeam(projectId: $projectId, name: $name) {
      id
      name
      projectId
    }
  }
`;

export const CREATE_TASK = `
  mutation CreateTask($projectId: ID!, $title: String!, $description: String!, $teamId: ID) {
    createTask(projectId: $projectId, title: $title, description: $description, teamId: $teamId) {
      id
      title
    }
  }
`;

export const CREATE_TASK_LINK = `
  mutation CreateTaskLink($projectId: ID!, $sourceTaskId: ID!, $targetTaskId: ID!, $label: String!) {
    createTaskLink(projectId: $projectId, sourceTaskId: $sourceTaskId, targetTaskId: $targetTaskId, label: $label)
  }
`;

export const UPDATE_TASKS = `
  mutation UpdateTasks($projectId: ID!, $tasks: [UpdateTaskInput!]!) {
    updateTasks(projectId: $projectId, tasks: $tasks)
  }
`;
