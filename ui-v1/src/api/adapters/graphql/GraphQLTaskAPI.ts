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

const GRAPHQL_URL = 'http://localhost:3000/graphql';

export class GraphQLTaskAPI implements TaskAPI {
  private token: string | null;
  constructor(token: string | null) {
    this.token = token;
  }

  private async query<T>(query: any, variables: any = {}): Promise<T> {
    const queryStr = typeof query === 'string' ? query : print(query);
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
      console.error('GraphQL Errors:', result.errors);
      throw new Error(result.errors[0].message);
    }
    return result.data as T;
  }

  private mapTask(t: any): ProjectTask {
    if (!t) return t;
    return {
      ...t,
      createdById: t.createdBy,
      team: t.team ? { id: t.team.id, name: t.team.name, projectId: t.projectId } : undefined,
      assignee: t.assignee ? { id: t.assignee.id, username: t.assignee.username, email: '' } : undefined,
    };
  }

  async getProjectTasks(projectId: string): Promise<ProjectTask[]> {
    const data = await this.query<GetProjectTasksQuery>(graphql(`
      query GetProjectTasks($projectId: ID!) {
        projectTasks(projectId: $projectId) {
          edges {
            node {
              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
              team { id name }
              assignee { id username }
            }
          }
        }
      }
    `), { projectId });
    return data.projectTasks.edges.map(e => this.mapTask(e.node));
  }

  async getProjectLinks(_projectId: string): Promise<TaskLink[]> {
    return [];
  }

  async getTask(id: string): Promise<ProjectTask | null> {
    const data = await this.query<GetTaskQuery>(graphql(`
      query GetTask($id: ID!) {
        task(id: $id) {
          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
          team { id name }
          assignee { id username }
        }
      }
    `), { id });
    return data.task ? this.mapTask(data.task) : null;
  }

  async getTaskNeighbourhood(taskId: string, maxDepth = 2, _limit = 50, after?: string): Promise<TaskNeighbourhood> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error("Task not found");

    const data = await this.query<GetNeighbourhoodQuery>(graphql(`
      query GetNeighbourhood($projectId: ID!, $taskId: ID!, $maxDepth: Int, $after: String) {
        taskNeighbourhood(projectId: $projectId, taskId: $taskId, maxDepth: $maxDepth, after: $after) {
          focusedTask {
            id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
            team { id name }
            assignee { id username }
          }
          nodes {
            task {
              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
              team { id name }
              assignee { id username }
            }
            depth
            direction
          }
          edges {
            id projectId sourceTaskId targetTaskId label createdAt
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `), { projectId: task.projectId, taskId, maxDepth, after });

    const n = data.taskNeighbourhood;
    return {
      focusedTask: this.mapTask(n.focusedTask),
      nodes: n.nodes.map((node: any) => ({
        ...node,
        task: this.mapTask(node.task)
      })),
      edges: n.edges,
      incomingStories: [],
      outgoingStories: [],
      hasNextPage: n.pageInfo.hasNextPage,
      endCursor: n.pageInfo.endCursor || undefined
    };
  }

  async createTask(projectId: string, title: string, description?: string): Promise<ProjectTask> {
    const data = await this.query<CreateTaskMutation>(graphql(`
      mutation CreateTask($projectId: ID!, $title: String!, $description: String) {
        createTask(projectId: $projectId, title: $title, description: $description) {
          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
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
}
