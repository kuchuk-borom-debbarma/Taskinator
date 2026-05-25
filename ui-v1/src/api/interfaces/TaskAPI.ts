import type { PageInfo, PaginationArgs, ProjectTask, TaskLink, NeighbourDirection } from '../types';

export interface TaskAPI {
  getTasks(
    projectId: string,
    params?: PaginationArgs & {
      teamId?: string,
      memberId?: string,
    }
  ): Promise<{ tasks: ProjectTask[], pageInfo: PageInfo }>;

  getTask(id: string): Promise<ProjectTask | null>;

  getTaskDetail(id: string): Promise<{
    task: ProjectTask | null,
    incoming: { links: TaskLink[], pageInfo: PageInfo },
    outgoing: { links: TaskLink[], pageInfo: PageInfo },
  }>;

  createTask(input: { projectId: string; title: string; description?: string; status?: string; priority?: number; dueDate?: string }): Promise<ProjectTask>;

  updateTask(taskId: string, input: { 
    projectId: string; 
    version: number; 
    title?: string; 
    description?: string; 
    status?: string; 
    teamId?: string | null; 
    memberId?: string | null;
    priority?: number;
    dueDate?: string | null;
  }): Promise<ProjectTask>;

  deleteTask(projectId: string, taskId: string): Promise<string>;

  createTaskLink(input: { projectId: string; sourceTaskId: string; targetTaskId: string; label: string }): Promise<TaskLink>;
  
  updateTaskLink(input: { projectId: string; linkId: string; sourceTaskId?: string; targetTaskId?: string; label?: string }): Promise<TaskLink>;

  deleteTaskLink(projectId: string, linkId: string): Promise<string>;

  getTaskNeighbourLinks(
    taskId: string,
    direction?: NeighbourDirection,
    depthLimit?: number,
    pagination?: PaginationArgs
  ): Promise<{ links: TaskLink[], pageInfo: PageInfo }>;

  getTaskGraphPage(
    taskId: string,
    params?: PaginationArgs & {
      depthLimit?: number,
    }
  ): Promise<{
    task: ProjectTask | null,
    links: TaskLink[],
    pageInfo: PageInfo,
  }>;
}

