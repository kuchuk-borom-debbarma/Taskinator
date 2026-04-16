import type { ProjectTask, TaskLink, TaskNeighbourhood } from '../types';

export interface TaskAPI {
  getProjectTasks(projectId: string): Promise<ProjectTask[]>;
  getProjectLinks(projectId: string): Promise<TaskLink[]>;
  getTask(id: string): Promise<ProjectTask | null>;
  getTaskNeighbourhood(taskId: string, maxDepth?: number, after?: string): Promise<TaskNeighbourhood>;
  createTask(projectId: string, title: string, description?: string): Promise<ProjectTask>;
  updateTask(taskId: string, updates: Partial<ProjectTask>): Promise<ProjectTask>;
  createTaskLink(projectId: string, sourceId: string, targetId: string, label: string): Promise<TaskLink>;
}
