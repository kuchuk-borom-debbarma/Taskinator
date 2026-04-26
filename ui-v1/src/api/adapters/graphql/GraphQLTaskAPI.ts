import type { TaskAPI } from '../../interfaces/TaskAPI';
import type { ProjectTask, TaskLink, NeighbourDirection } from '../../types';
import { AuthenticationError } from '../../errors';

const GRAPHQL_URL = 'http://localhost:3000/graphql';

const gql = String.raw;

const TASK_FIELDS = `
  id
  title
  description
  status
  priority
  dueDate
  version
  createdAt
  updatedAt
  project { id name }
  team { id name }
  assignedMember { id username }
  createdBy { id username }
  updatedBy { id username }
`;

const TASK_LINK_FIELDS = `
  id
  label
  createdAt
  updatedAt
  source {
    id title status priority
    project { id }
    team { id name }
    assignedMember { id username }
  }
  target {
    id title status priority
    project { id }
    team { id name }
    assignedMember { id username }
  }
  createdBy { id username }
`;

export class GraphQLTaskAPI implements TaskAPI {
  private token: string | null;
  private onUnauthorized?: () => void;

  constructor(token: string | null, options?: { onUnauthorized?: () => void }) {
    this.token = token;
    this.onUnauthorized = options?.onUnauthorized;
  }

  private async query<T>(queryStr: string, variables: any = {}): Promise<T> {
    const operationMatch = queryStr.match(/(query|mutation)\s+(\w+)/);
    const opName = operationMatch?.[2] || 'Anonymous';
    const start = performance.now();

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ query: queryStr, variables, operationName: opName }),
    });

    const result = await response.json();
    const duration = (performance.now() - start).toFixed(0);

    if (result.errors) {
      console.groupCollapsed(
        `%c[GQL ERROR] %c${opName} %c(${duration}ms)`,
        'color: #ef4444; font-size: 10px;',
        'color: #ef4444; font-weight: bold;',
        'color: #94a3b8; font-weight: normal;'
      );
      console.error('Errors:', result.errors);
      console.log('Variables:', variables);
      console.groupEnd();

      const firstError = result.errors[0];
      if (firstError.extensions?.code === 'UNAUTHENTICATED') {
        this.onUnauthorized?.();
        throw new AuthenticationError();
      }
      throw new Error(firstError.message);
    }

    return result.data as T;
  }

  async getTasks(
    projectId: string,
    params: {
      teamId?: string,
      memberId?: string,
      first?: number,
      after?: string,
      last?: number,
      before?: string
    } = {}
  ): Promise<{ tasks: ProjectTask[], hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null, startCursor: string | null }> {
    const { teamId, memberId, first, after, last, before } = params;
    const data = await this.query<any>(gql`
      query GetProjectTasks($projectId: ID!, $teamId: ID, $memberId: ID, $first: Int, $after: String, $last: Int, $before: String) {
        project(id: $projectId) {
          projectTasks(teamId: $teamId, memberId: $memberId, first: $first, after: $after, last: $last, before: $before) {
            edges {
              node {
                ${TASK_FIELDS}
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
      }
    `, { projectId, teamId, memberId, first, after, last, before });

    const conn = data.project?.projectTasks;
    if (!conn) return { tasks: [], hasNextPage: false, hasPreviousPage: false, endCursor: null, startCursor: null };

    return {
      tasks: conn.edges.map((e: any) => e.node),
      hasNextPage: conn.pageInfo.hasNextPage || false,
      hasPreviousPage: conn.pageInfo.hasPreviousPage || false,
      endCursor: conn.pageInfo.endCursor || null,
      startCursor: conn.pageInfo.startCursor || null,
    };
  }

  async getTask(id: string): Promise<ProjectTask | null> {
    const data = await this.query<any>(gql`
      query GetTask($id: ID!) {
        task(id: $id) {
          ${TASK_FIELDS}
        }
      }
    `, { id });
    return data.task || null;
  }

  async createTask(input: { projectId: string; title: string; description?: string; status?: string; teamId?: string; memberId?: string }): Promise<ProjectTask> {
    const data = await this.query<any>(gql`
      mutation CreateTask($input: CreateTaskInput!) {
        task {
          create(input: $input) {
            ${TASK_FIELDS}
          }
        }
      }
    `, { input });
    return data.task.create;
  }

  async updateTask(taskId: string, input: { projectId: string; version: number; title?: string; description?: string; status?: string; teamId?: string; memberId?: string }): Promise<ProjectTask> {
    const data = await this.query<any>(gql`
      mutation UpdateTask($taskId: ID!, $input: UpdateTaskInput!) {
        task {
          update(taskId: $taskId, input: $input) {
            ${TASK_FIELDS}
          }
        }
      }
    `, { taskId, input });
    return data.task.update;
  }

  async deleteTask(projectId: string, taskId: string): Promise<string> {
    const data = await this.query<any>(gql`
      mutation DeleteTask($projectId: ID!, $taskId: ID!) {
        task {
          delete(projectId: $projectId, taskId: $taskId)
        }
      }
    `, { projectId, taskId });
    return data.task.delete;
  }

  async createTaskLink(input: { projectId: string; sourceTaskId: string; targetTaskId: string; label: string }): Promise<TaskLink> {
    const data = await this.query<any>(gql`
      mutation CreateTaskLink($input: CreateTaskLinkInput!) {
        task {
          createLink(input: $input) {
            ${TASK_LINK_FIELDS}
          }
        }
      }
    `, { input });
    return data.task.createLink;
  }

  async deleteTaskLink(projectId: string, linkId: string): Promise<string> {
    const data = await this.query<any>(gql`
      mutation DeleteTaskLink($projectId: ID!, $linkId: ID!) {
        task {
          deleteLink(projectId: $projectId, linkId: $linkId)
        }
      }
    `, { projectId, linkId });
    return data.task.deleteLink;
  }

  async getTaskNeighbourLinks(
    taskId: string,
    direction: NeighbourDirection = 'both',
    depthLimit: number = 1,
    first?: number,
    after?: string,
    last?: number,
    before?: string
  ): Promise<{ links: TaskLink[], hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null, startCursor: string | null }> {
    const data = await this.query<any>(gql`
      query GetTaskNeighbourLinks($taskId: ID!, $direction: NeighbourDirection, $depthLimit: Int, $first: Int, $after: String, $last: Int, $before: String) {
        task(id: $taskId) {
          neighbourLinks(direction: $direction, depthLimit: $depthLimit, first: $first, after: $after, last: $last, before: $before) {
            edges {
              node {
                ${TASK_LINK_FIELDS}
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
      }
    `, { taskId, direction, depthLimit, first, after, last, before });

    const conn = data.task?.neighbourLinks;
    if (!conn) return { links: [], hasNextPage: false, hasPreviousPage: false, endCursor: null, startCursor: null };

    return {
      links: conn.edges.map((e: any) => e.node),
      hasNextPage: conn.pageInfo.hasNextPage || false,
      hasPreviousPage: conn.pageInfo.hasPreviousPage || false,
      endCursor: conn.pageInfo.endCursor || null,
      startCursor: conn.pageInfo.startCursor || null,
    };
  }
}
