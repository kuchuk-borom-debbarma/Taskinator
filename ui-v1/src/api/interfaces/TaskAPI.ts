import type { ProjectTask, TaskLink, TaskNeighbourhood } from '../types';

export interface TaskAPI {
  getProjectTasks(
    projectId: string, 
    first?: number, 
    after?: string, 
    last?: number, 
    before?: string
  ): Promise<{ tasks: ProjectTask[], hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null, startCursor: string | null }>;
  getProjectLinks(projectId: string, first?: number, after?: string): Promise<{ links: TaskLink[], hasNextPage: boolean, endCursor: string | null }>;
  getTask(id: string): Promise<ProjectTask | null>;
  getTaskNeighbourhood(projectId: string, taskId: string, maxDepth?: number, limit?: number, after?: string): Promise<TaskNeighbourhood>;
  createTask(projectId: string, title: string, description?: string): Promise<ProjectTask>;
  updateTask(taskId: string, updates: Partial<ProjectTask>): Promise<ProjectTask>;
  createTaskLink(projectId: string, sourceId: string, targetId: string, label: string): Promise<TaskLink>;
  getTaskIncomingLinks(taskId: string, first?: number, after?: string, last?: number, before?: string): Promise<{ links: TaskLink[], hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null, startCursor: string | null }>;
  getTaskOutgoingLinks(taskId: string, first?: number, after?: string, last?: number, before?: string): Promise<{ links: TaskLink[], hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null, startCursor: string | null }>;
}
