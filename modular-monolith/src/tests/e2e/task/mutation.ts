export const CREATE_TASK = `
  mutation CreateTask($input: CreateTaskInput!) {
    task {
      create(input: $input) {
        id
        project { id }
        team { id }
        assignedMember { id }
        title
        description
        status
        version
        createdBy { id }
        createdAt
        updatedAt
      }
    }
  }
`;

export const UPDATE_TASK = `
  mutation UpdateTask($taskId: ID!, $input: UpdateTaskInput!) {
    task {
      update(taskId: $taskId, input: $input) {
        id
        project { id }
        team { id }
        assignedMember { id }
        title
        description
        status
        version
        updatedBy { id }
        updatedAt
      }
    }
  }
`;

export const DELETE_TASK = `
  mutation DeleteTask($projectId: ID!, $taskId: ID!) {
    task {
      delete(projectId: $projectId, taskId: $taskId)
    }
  }
`;

export const CREATE_TASK_LINK = `
  mutation CreateTaskLink($input: CreateTaskLinkInput!) {
    task {
      createLink(input: $input) {
        id
        source { id }
        target { id }
        label
        createdAt
      }
    }
  }
`;

export const DELETE_TASK_LINK = `
  mutation DeleteTaskLink($projectId: ID!, $linkId: ID!) {
    task {
      deleteLink(projectId: $projectId, linkId: $linkId)
    }
  }
`;

export const UPDATE_TASK_LINK = `
  mutation UpdateTaskLink($input: UpdateTaskLinkInput!) {
    task {
      updateLink(input: $input) {
        id
        source { id }
        target { id }
        label
        updatedAt
      }
    }
  }
`;
