import type { TaskAPI } from '../../interfaces/TaskAPI';
import type { PageInfo, PaginationArgs, ProjectTask, TaskLink, NeighbourDirection, SimulatedSlip, TaskComment, TaskActivityLog } from '../../types';
import { AuthenticationError } from '../../errors';

import { CONFIG } from '../../../config';

const GRAPHQL_URL = CONFIG.API_URL;

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

const COMMENT_FIELDS = `
  id
  content
  version
  createdAt
  updatedAt
  author { id username }
`;

const ACTIVITY_LOG_FIELDS = `
  id
  actionType
  createdAt
  actor { id username }
  changes {
    field
    oldValue
    newValue
  }
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

  private async getTaskNeighbourLinksPage(
    taskId: string,
    direction: NeighbourDirection,
    depthLimit: number = 1,
    pagination?: PaginationArgs
  ): Promise<{ links: TaskLink[], pageInfo: PageInfo }> {
    const { first, after, last, before } = pagination || {};
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
    if (!conn) return { links: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null, startCursor: null } };

    return {
      links: conn.edges.map((e: any) => e.node),
      pageInfo: {
        hasNextPage: conn.pageInfo.hasNextPage || false,
        hasPreviousPage: conn.pageInfo.hasPreviousPage || false,
        endCursor: conn.pageInfo.endCursor || null,
        startCursor: conn.pageInfo.startCursor || null,
      }
    };
  }

  async getTasks(
    projectId: string,
    params: PaginationArgs & {
      teamId?: string;
      memberId?: string;
      search?: string;
      status?: string;
      priority?: number;
    } = {}
  ): Promise<{ tasks: ProjectTask[], pageInfo: PageInfo }> {
    const { teamId, memberId, first, after, last, before, search, status, priority } = params;
    const data = await this.query<any>(gql`
      query GetProjectTasks($projectId: ID!, $teamId: ID, $memberId: ID, $first: Int, $after: String, $last: Int, $before: String, $search: String, $status: String, $priority: Int) {
        project(id: $projectId) {
          projectTasks(teamId: $teamId, memberId: $memberId, first: $first, after: $after, last: $last, before: $before, search: $search, status: $status, priority: $priority) {
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
    `, { projectId, teamId, memberId, first, after, last, before, search, status, priority });

    const conn = data.project?.projectTasks;
    if (!conn) return { tasks: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null, startCursor: null } };

    return {
      tasks: conn.edges.map((e: any) => e.node),
      pageInfo: {
        hasNextPage: conn.pageInfo.hasNextPage || false,
        hasPreviousPage: conn.pageInfo.hasPreviousPage || false,
        endCursor: conn.pageInfo.endCursor || null,
        startCursor: conn.pageInfo.startCursor || null,
      }
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

  async getTaskDetail(id: string): Promise<{
    task: ProjectTask | null,
    incoming: { links: TaskLink[], pageInfo: PageInfo },
    outgoing: { links: TaskLink[], pageInfo: PageInfo },
  }> {
    const data = await this.query<any>(gql`
      query GetTaskDetail($id: ID!) {
        task(id: $id) {
          ${TASK_FIELDS}
          incoming: neighbourLinks(direction: incoming, first: 5) {
            edges { node { ${TASK_LINK_FIELDS} } }
            pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
          }
          outgoing: neighbourLinks(direction: outgoing, first: 5) {
            edges { node { ${TASK_LINK_FIELDS} } }
            pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
          }
        }
      }
    `, { id });

    const task = data.task || null;
    const incoming = data.task?.incoming;
    const outgoing = data.task?.outgoing;

    const emptyPage = { links: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null, startCursor: null } };

    return {
      task,
      incoming: incoming ? {
        links: incoming.edges.map((e: any) => e.node),
        pageInfo: incoming.pageInfo
      } : emptyPage,
      outgoing: outgoing ? {
        links: outgoing.edges.map((e: any) => e.node),
        pageInfo: outgoing.pageInfo
      } : emptyPage,
    };
  }

  async getTaskGraphPage(
    taskId: string,
    params: PaginationArgs & {
      depthLimit?: number,
    } = {}
  ): Promise<{
    task: ProjectTask | null,
    links: TaskLink[],
    pageInfo: PageInfo,
  }> {
    const { first, after, last, before, depthLimit } = params;
    const data = await this.query<any>(gql`
      query GetTaskGraphPage($taskId: ID!, $direction: NeighbourDirection, $depthLimit: Int, $first: Int, $after: String, $last: Int, $before: String) {
        task(id: $taskId) {
          ${TASK_FIELDS}
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
    `, { taskId, direction: 'both', depthLimit, first, after, last, before });

    const task = data.task || null;
    const conn = data.task?.neighbourLinks;

    return {
      task,
      links: conn?.edges.map((e: any) => e.node) || [],
      pageInfo: {
        hasNextPage: conn?.pageInfo.hasNextPage || false,
        hasPreviousPage: conn?.pageInfo.hasPreviousPage || false,
        endCursor: conn?.pageInfo.endCursor || null,
        startCursor: conn?.pageInfo.startCursor || null,
      }
    };
  }

  async createTask(input: { projectId: string; title: string; description?: string; status?: string; priority?: number; dueDate?: string }): Promise<ProjectTask> {
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

  async updateTask(taskId: string, input: { 
    projectId: string; 
    version: number; 
    title?: string; 
    description?: string; 
    status?: string; 
    teamId?: string | null; 
    memberId?: string | null;
    priority?: number;
    dueDate?: string | null;
  }): Promise<ProjectTask> {
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

  async updateTaskLink(input: { projectId: string; linkId: string; sourceTaskId?: string; targetTaskId?: string; label?: string }): Promise<TaskLink> {
    const data = await this.query<any>(gql`
      mutation UpdateTaskLink($input: UpdateTaskLinkInput!) {
        task {
          updateLink(input: $input) {
            ${TASK_LINK_FIELDS}
          }
        }
      }
    `, { input });
    return data.task.updateLink;
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
    pagination?: PaginationArgs
  ): Promise<{ links: TaskLink[], pageInfo: PageInfo }> {
    return this.getTaskNeighbourLinksPage(
      taskId,
      direction,
      depthLimit,
      pagination
    );
  }

  async simulateSlippage(
    projectId: string,
    taskId: string,
    delayDays: number
  ): Promise<SimulatedSlip[]> {
    const data = await this.query<any>(gql`
      query SimulateSlippage($projectId: ID!, $taskId: ID!, $delayDays: Int!) {
        simulateSlippage(projectId: $projectId, taskId: $taskId, delayDays: $delayDays) {
          taskId
          title
          originalDueDate
          simulatedDueDate
          slipDays
          riskLevel
          bufferRemainingDays
        }
      }
    `, { projectId, taskId, delayDays });
    return data.simulateSlippage;
  }

  async getTaskComments(
    taskId: string,
    pagination?: PaginationArgs
  ): Promise<{ comments: TaskComment[], pageInfo: PageInfo }> {
    const { first, after, last, before } = pagination || {};
    const data = await this.query<any>(gql`
      query GetTaskComments($taskId: ID!, $first: Int, $after: String, $last: Int, $before: String) {
        task(id: $taskId) {
          comments(first: $first, after: $after, last: $last, before: $before) {
            edges {
              node {
                ${COMMENT_FIELDS}
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
    `, { taskId, first, after, last, before });

    const conn = data.task?.comments;
    if (!conn) return { comments: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null, startCursor: null } };

    return {
      comments: conn.edges.map((e: any) => e.node),
      pageInfo: {
        hasNextPage: conn.pageInfo.hasNextPage || false,
        hasPreviousPage: conn.pageInfo.hasPreviousPage || false,
        endCursor: conn.pageInfo.endCursor || null,
        startCursor: conn.pageInfo.startCursor || null,
      }
    };
  }

  async getTaskActivityLogs(
    taskId: string,
    pagination?: PaginationArgs
  ): Promise<{ logs: TaskActivityLog[], pageInfo: PageInfo }> {
    const { first, after, last, before } = pagination || {};
    const data = await this.query<any>(gql`
      query GetTaskActivityLogs($taskId: ID!, $first: Int, $after: String, $last: Int, $before: String) {
        task(id: $taskId) {
          activityLogs(first: $first, after: $after, last: $last, before: $before) {
            edges {
              node {
                ${ACTIVITY_LOG_FIELDS}
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
    `, { taskId, first, after, last, before });

    const conn = data.task?.activityLogs;
    if (!conn) return { logs: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null, startCursor: null } };

    return {
      logs: conn.edges.map((e: any) => e.node),
      pageInfo: {
        hasNextPage: conn.pageInfo.hasNextPage || false,
        hasPreviousPage: conn.pageInfo.hasPreviousPage || false,
        endCursor: conn.pageInfo.endCursor || null,
        startCursor: conn.pageInfo.startCursor || null,
      }
    };
  }

  async addComment(taskId: string, content: string): Promise<TaskComment> {
    const data = await this.query<any>(gql`
      mutation AddComment($taskId: ID!, $content: String!) {
        task {
          addComment(taskId: $taskId, content: $content) {
            ${COMMENT_FIELDS}
          }
        }
      }
    `, { taskId, content });
    return data.task.addComment;
  }

  async updateComment(commentId: string, content: string, version: number): Promise<TaskComment> {
    const data = await this.query<any>(gql`
      mutation UpdateComment($commentId: ID!, $content: String!, $version: Int!) {
        task {
          updateComment(commentId: $commentId, content: $content, version: $version) {
            ${COMMENT_FIELDS}
          }
        }
      }
    `, { commentId, content, version });
    return data.task.updateComment;
  }

  async deleteComment(commentId: string): Promise<string> {
    const data = await this.query<any>(gql`
      mutation DeleteComment($commentId: ID!) {
        task {
          deleteComment(commentId: $commentId)
        }
      }
    `, { commentId });
    return data.task.deleteComment;
  }
}
