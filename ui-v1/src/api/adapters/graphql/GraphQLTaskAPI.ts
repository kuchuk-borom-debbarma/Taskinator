import type { TaskAPI } from '../../interfaces/TaskAPI';
import type { ProjectTask, TaskLink, TaskNeighbourhood } from '../../types';
import { graphql } from '../../../gql';
import { print } from 'graphql';
import type { 
  GetProjectTasksQuery, 
  GetTaskQuery, 
  GetNeighbourhoodQuery,
  CreateTaskMutation,
  UpdateTaskMutation,
  CreateLinkMutation 
} from '../../../gql/graphql';
import { AuthenticationError } from '../../errors';

const GRAPHQL_URL = 'http://localhost:3000/graphql';

export class GraphQLTaskAPI implements TaskAPI {
  private token: string | null;
  private onUnauthorized?: () => void;
  private static queryCache = new Map<any, string>();

  constructor(token: string | null, options?: { onUnauthorized?: () => void }) {
    this.token = token;
    this.onUnauthorized = options?.onUnauthorized;
  }

  private async query<T>(query: any, variables: any = {}): Promise<T> {
    let queryStr: string;
    
    if (typeof query === 'string') {
      queryStr = query;
    } else {
      // Use cache for DocumentNode to avoid redundant print() overhead
      if (GraphQLTaskAPI.queryCache.has(query)) {
        queryStr = GraphQLTaskAPI.queryCache.get(query)!;
      } else {
        queryStr = print(query);
        GraphQLTaskAPI.queryCache.set(query, queryStr);
      }
    }

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ query: queryStr, variables }),
    });

    const result = await response.json();
    if (result.errors) {
      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      const firstError = result.errors[0];
      if (firstError.extensions?.code === 'UNAUTHENTICATED') {
        this.onUnauthorized?.();
        throw new AuthenticationError();
      }
      throw new Error(firstError.message);
    }
    return result.data as T;
  }

  private mapTask(t: any): ProjectTask {
    if (!t) return t;
    return {
      ...t,
      createdById: t.createdBy,
      incomingLinksCount: t.totalIncomingLinksCount,
      outgoingLinksCount: t.totalOutgoingLinksCount,
      incomingLabelCounts: (t.incomingLabelCounts?.edges || []).reduce((acc: any, edge: any) => {
        acc[edge.node.label] = edge.node.count;
        return acc;
      }, {}),
      outgoingLabelCounts: (t.outgoingLabelCounts?.edges || []).reduce((acc: any, edge: any) => {
        acc[edge.node.label] = edge.node.count;
        return acc;
      }, {}),
      team: t.team ? { id: t.team.id, name: t.team.name, projectId: t.projectId } : undefined,
      assignee: t.assignee ? { id: t.assignee.id, username: t.assignee.username, email: '' } : undefined,
    } as unknown as ProjectTask;
  }

  async getProjectTasks(projectId: string, first?: number, after?: string): Promise<{ tasks: ProjectTask[], hasNextPage: boolean, endCursor: string | null }> {
    const data = await this.query<GetProjectTasksQuery>(graphql(`
      query GetProjectTasks($projectId: ID!, $first: Int, $after: String) {
        projectTasks(projectId: $projectId, first: $first, after: $after) {
          edges {
            node {
              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
      totalIncomingLinksCount totalOutgoingLinksCount directIncomingLinksCount directOutgoingLinksCount 
      incomingLabelCounts { edges { node { label count } } } 
      outgoingLabelCounts { edges { node { label count } } }
              team { id name }
              assignee { id username }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `), { projectId, first, after });
    
    return {
      tasks: data.projectTasks.edges.map(e => this.mapTask(e.node)),
      hasNextPage: data.projectTasks.pageInfo.hasNextPage || false,
      endCursor: data.projectTasks.pageInfo.endCursor || null
    };
  }

  async getProjectLinks(projectId: string, first?: number, after?: string): Promise<{ links: TaskLink[], hasNextPage: boolean, endCursor: string | null }> {
    const data = await this.query<{ projectTaskLinks: { edges: { node: TaskLink }[], pageInfo: { hasNextPage: boolean, endCursor: string | null } } }>(
      `query GetProjectTaskLinks($projectId: ID!, $first: Int, $after: String) {
        projectTaskLinks(projectId: $projectId, first: $first, after: $after) {
          edges {
            node {
              id projectId sourceTaskId targetTaskId label createdAt
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }`,
      { projectId, first, after }
    );
    return {
      links: data.projectTaskLinks.edges.map(e => e.node),
      hasNextPage: data.projectTaskLinks.pageInfo.hasNextPage,
      endCursor: data.projectTaskLinks.pageInfo.endCursor
    };
  }

  async getTask(id: string): Promise<ProjectTask | null> {
    const data = await this.query<GetTaskQuery>(graphql(`
      query GetTask($id: ID!) {
        task(id: $id) {
          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
      totalIncomingLinksCount totalOutgoingLinksCount directIncomingLinksCount directOutgoingLinksCount 
      incomingLabelCounts { edges { node { label count } } } 
      outgoingLabelCounts { edges { node { label count } } }
          team { id name }
          assignee { id username }
        }
      }
    `), { id });
    return data.task ? this.mapTask(data.task) : null;
  }

  async getTaskNeighbourhood(projectId: string, taskId: string, maxDepth?: number, limit?: number, after?: string): Promise<TaskNeighbourhood> {
    const data = await this.query<GetNeighbourhoodQuery>(graphql(`
      query GetNeighbourhood($projectId: ID!, $taskId: ID!, $maxDepth: Int, $first: Int, $after: String) {
        taskNeighbourhood(projectId: $projectId, taskId: $taskId, maxDepth: $maxDepth, first: $first, after: $after) {
          focusedTask {
            id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
            totalIncomingLinksCount totalOutgoingLinksCount directIncomingLinksCount directOutgoingLinksCount 
      incomingLabelCounts { edges { node { label count } } } 
      outgoingLabelCounts { edges { node { label count } } }
            team { id name }
            assignee { id username }
          }
          nodes {
            edges {
              node {
                task {
                  id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
                  totalIncomingLinksCount totalOutgoingLinksCount directIncomingLinksCount directOutgoingLinksCount 
      incomingLabelCounts { edges { node { label count } } } 
      outgoingLabelCounts { edges { node { label count } } }
                  team { id name }
                  assignee { id username }
                }
                depth
                direction
              }
            }
          }
          edges {
            edges {
              node {
                id projectId sourceTaskId targetTaskId label createdAt
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `), { projectId, taskId, maxDepth, first: limit, after });

    const n = data.taskNeighbourhood;
    if (!n) {
      throw new Error("Task Neighbourhood not found or unauthorized");
    }

    return {
      focusedTask: this.mapTask(n.focusedTask),
      nodes: (n.nodes?.edges || []).map((e: any) => ({
        ...e.node,
        task: this.mapTask(e.node.task)
      })),
      edges: (n.edges?.edges || []).map((e: any) => e.node),
      incomingStories: [],
      outgoingStories: [],
      hasNextPage: n.pageInfo?.hasNextPage || false,
      endCursor: n.pageInfo?.endCursor || undefined
    };
  }

  async createTask(projectId: string, title: string, description?: string): Promise<ProjectTask> {
    const data = await this.query<CreateTaskMutation>(graphql(`
      mutation CreateTask($projectId: ID!, $title: String!, $description: String) {
        createTask(projectId: $projectId, title: $title, description: $description) {
          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
      totalIncomingLinksCount totalOutgoingLinksCount directIncomingLinksCount directOutgoingLinksCount 
      incomingLabelCounts { edges { node { label count } } } 
      outgoingLabelCounts { edges { node { label count } } }
          team { id name }
          assignee { id username }
        }
      }
    `), { projectId, title, description });
    return this.mapTask(data.createTask);
  }

  async updateTask(taskId: string, updates: Partial<ProjectTask>): Promise<ProjectTask> {
    const data = await this.query<UpdateTaskMutation>(graphql(`
      mutation UpdateTask($taskId: ID!, $title: String, $description: String, $status: String) {
        updateTask(taskId: $taskId, title: $title, description: $description, status: $status) {
          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
      totalIncomingLinksCount totalOutgoingLinksCount directIncomingLinksCount directOutgoingLinksCount 
      incomingLabelCounts { edges { node { label count } } } 
      outgoingLabelCounts { edges { node { label count } } }
          team { id name }
          assignee { id username }
        }
      }
    `), { taskId, ...updates });
    return this.mapTask(data.updateTask);
  }

  async createTaskLink(projectId: string, sourceId: string, targetId: string, label: string): Promise<TaskLink> {
    const data = await this.query<CreateLinkMutation>(graphql(`
      mutation CreateLink($projectId: ID!, $sourceId: ID!, $targetId: ID!, $label: String!) {
        createTaskLink(projectId: $projectId, sourceTaskId: $sourceId, targetTaskId: $targetId, label: $label) {
          id projectId sourceTaskId targetTaskId label createdAt
        }
      }
    `), { projectId, sourceId, targetId, label });
    return data.createTaskLink;
  }

  async getTaskIncomingLinks(taskId: string, first?: number, after?: string): Promise<{ links: TaskLink[], hasNextPage: boolean, endCursor: string | null }> {
    const data = await this.query<any>(`
      query GetTaskIncomingLinks($taskId: ID!, $first: Int, $after: String) {
        task(id: $taskId) {
          incomingLinks(first: $first, after: $after) {
            edges {
              node {
                id projectId sourceTaskId targetTaskId label createdAt
                sourceTask { id title status }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `, { taskId, first, after });
    const conn = data.task.incomingLinks;
    return {
      links: conn.edges.map((e: any) => e.node),
      hasNextPage: conn.pageInfo.hasNextPage,
      endCursor: conn.pageInfo.endCursor
    };
  }

  async getTaskOutgoingLinks(taskId: string, first?: number, after?: string): Promise<{ links: TaskLink[], hasNextPage: boolean, endCursor: string | null }> {
    const data = await this.query<any>(`
      query GetTaskOutgoingLinks($taskId: ID!, $first: Int, $after: String) {
        task(id: $taskId) {
          outgoingLinks(first: $first, after: $after) {
            edges {
              node {
                id projectId sourceTaskId targetTaskId label createdAt
                targetTask { id title status }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `, { taskId, first, after });
    const conn = data.task.outgoingLinks;
    return {
      links: conn.edges.map((e: any) => e.node),
      hasNextPage: conn.pageInfo.hasNextPage,
      endCursor: conn.pageInfo.endCursor
    };
  }
}
