import type { TaskAPI } from '../../interfaces/TaskAPI';
import type { ProjectTask, TaskLink, TaskNeighbourhood } from '../../types';

const GRAPHQL_URL = 'http://localhost:3000/graphql';

// Hardcoded development token
// Decodes to: { id: "user-1", email: "dev@taskinator.io", username: "devuser" }
// Signed with: "super-secret-jwt-key"
const DEV_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItMSIsImVtYWlsIjoiZGV2QHRhc2tpbmF0b3IuaW8iLCJ1c2VybmFtZSI6ImRldnVzZXIiLCJpYXQiOjE3NzYwODk2MDAsImV4cCI6MTg3NjA4OTYwMH0.R1-4M9T1_rS_O8X_92-6l_fH_h6-L_S-A_T_I_N_A_T_O_R'; // Mocked for simplicity

export class GraphQLTaskAPI implements TaskAPI {
  private async query<T>(query: string, variables: any = {}): Promise<T> {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEV_TOKEN}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();
    if (result.errors) {
      console.error('GraphQL Errors:', result.errors);
      throw new Error(result.errors[0].message);
    }
    return result.data as T;
  }

  private mapTask(t: any): ProjectTask {
    return {
      ...t,
      createdById: t.createdBy, // Mapping backend field 'createdBy' to frontend 'createdById'
    };
  }

  async getProjectTasks(projectId: string): Promise<ProjectTask[]> {
    const data = await this.query<{ projectTasks: { edges: { node: any }[] } }>(`
      query GetProjectTasks($projectId: ID!) {
        projectTasks(projectId: $projectId) {
          edges {
            node {
              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
            }
          }
        }
      }
    `, { projectId });
    return data.projectTasks.edges.map(e => this.mapTask(e.node));
  }

  async getProjectLinks(projectId: string): Promise<TaskLink[]> {
    // This isn't directly exposed as a flat list in the current schema for whole projects
    // but we can fetch them via a larger discovery or just return empty for now as Map uses neighbourhood
    return [];
  }

  async getTask(id: string): Promise<ProjectTask | null> {
    const data = await this.query<{ task: any }>(`
      query GetTask($id: ID!) {
        task(id: $id) {
          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
        }
      }
    `, { id });
    return data.task ? this.mapTask(data.task) : null;
  }

  async getTaskNeighbourhood(taskId: string, maxDepth = 2, limit = 50, after?: string): Promise<TaskNeighbourhood> {
    // Note: backend 'taskNeighbourhood' query expects 'projectId'
    // I need to get the task first to find its projectId if not provided, 
    // but our interface doesn't pass projectId here.
    // For now, I'll fetch the task first or use a dummy projectId if the interface is restrictive.
    const task = await this.getTask(taskId);
    if (!task) throw new Error("Task not found");

    const data = await this.query<{ taskNeighbourhood: any }>(`
      query GetNeighbourhood($projectId: ID!, $taskId: ID!, $maxDepth: Int, $after: String) {
        taskNeighbourhood(projectId: $projectId, taskId: $taskId, maxDepth: $maxDepth, after: $after) {
          focusedTask {
            id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
          }
          nodes {
            task {
              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
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
    `, { projectId: task.projectId, taskId, maxDepth, after });

    const n = data.taskNeighbourhood;
    return {
      focusedTask: this.mapTask(n.focusedTask),
      nodes: n.nodes.map((node: any) => ({
        ...node,
        task: this.mapTask(node.task)
      })),
      edges: n.edges,
      incomingStories: [], // Stories logic is frontend-only or not yet in schema
      outgoingStories: [],
      hasNextPage: n.pageInfo.hasNextPage,
      endCursor: n.pageInfo.endCursor
    };
  }

  async createTask(projectId: string, title: string, description?: string): Promise<ProjectTask> {
    const data = await this.query<{ createTask: any }>(`
      mutation CreateTask($projectId: ID!, $title: String!, $description: String) {
        createTask(projectId: $projectId, title: $title, description: $description) {
          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
        }
      }
    `, { projectId, title, description });
    return this.mapTask(data.createTask);
  }

  async updateTask(taskId: string, updates: Partial<ProjectTask>): Promise<ProjectTask> {
    const data = await this.query<{ updateTask: any }>(`
      mutation UpdateTask($taskId: ID!, $title: String, $description: String, $status: String) {
        updateTask(taskId: $taskId, title: $title, description: $description, status: $status) {
          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy
        }
      }
    `, { taskId, ...updates });
    return this.mapTask(data.updateTask);
  }

  async createTaskLink(projectId: string, sourceId: string, targetId: string, label: string): Promise<TaskLink> {
    const data = await this.query<{ createTaskLink: any }>(`
      mutation CreateLink($projectId: ID!, $sourceId: ID!, $targetId: ID!, $label: String!) {
        createTaskLink(projectId: $projectId, sourceTaskId: $sourceId, targetTaskId: $targetId, label: $label) {
          id projectId sourceTaskId targetTaskId label createdAt
        }
      }
    `, { projectId, sourceId, targetId, label });
    return data.createTaskLink;
  }
}
