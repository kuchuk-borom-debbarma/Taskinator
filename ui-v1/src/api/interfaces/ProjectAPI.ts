import type { Project } from '../types';

export interface ProjectAPI {
  getProjects(first?: number, after?: string): Promise<{ projects: Project[], hasNextPage: boolean, endCursor: string | null }>;
  getProject(id: string): Promise<Project | null>;
  createProject(name: string, description?: string): Promise<Project>;
}
