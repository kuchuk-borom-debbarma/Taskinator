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
