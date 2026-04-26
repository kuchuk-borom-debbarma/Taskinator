import type { ProjectTask, TaskLink, NeighbourDirection } from '../types';

export interface TaskAPI {
  getTasks(
    projectId: string,
    params?: {
      teamId?: string,
      memberId?: string,
      first?: number,
      after?: string,
      last?: number,
      before?: string
    }
  ): Promise<{ tasks: ProjectTask[], hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null, startCursor: string | null }>;

  getTask(id: string): Promise<ProjectTask | null>;

  createTask(input: { projectId: string; title: string; description?: string; status?: string; teamId?: string; memberId?: string }): Promise<ProjectTask>;

  updateTask(taskId: string, input: { projectId: string; version: number; title?: string; description?: string; status?: string; teamId?: string; memberId?: string }): Promise<ProjectTask>;

  deleteTask(projectId: string, taskId: string): Promise<string>;

  createTaskLink(input: { projectId: string; sourceTaskId: string; targetTaskId: string; label: string }): Promise<TaskLink>;

  deleteTaskLink(projectId: string, linkId: string): Promise<string>;

  getTaskNeighbourLinks(
    taskId: string,
    direction?: NeighbourDirection,
    depthLimit?: number,
    first?: number,
    after?: string,
    last?: number,
    before?: string
  ): Promise<{ links: TaskLink[], hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null, startCursor: string | null }>;

  getTaskGraphPage(
    taskId: string,
    params?: {
      first?: number,
      after?: string,
      last?: number,
      before?: string,
      depthLimit?: number,
    }
  ): Promise<{
    task: ProjectTask | null,
    links: TaskLink[],
    hasNextPage: boolean,
    hasPreviousPage: boolean,
    endCursor: string | null,
    startCursor: string | null,
  }>;
}
