import type { Project, ProjectMember } from '../types';

export interface ProjectAPI {
  getProjects(first?: number, after?: string): Promise<{ projects: Project[], hasNextPage: boolean, endCursor: string | null, totalCount?: number }>;
  getProject(id: string): Promise<Project | null>;
  createProject(name: string, description?: string): Promise<Project>;
  updateProject(id: string, version: number, name?: string, description?: string): Promise<Project>;
  deleteProjects(projectIds: string[]): Promise<{ success: boolean; deletedCount: number }>;
  addProjectMembers(projectId: string, userIds: string[]): Promise<{ success: boolean }>;
  removeProjectMembers(projectId: string, memberIds: string[]): Promise<{ success: boolean }>;
  getProjectMembers(projectId: string, first?: number, after?: string): Promise<{ members: ProjectMember[], hasNextPage: boolean, endCursor: string | null }>;
  getProjectLinks(projectId: string, first?: number, after?: string): Promise<{ links: any[], hasNextPage: boolean, endCursor: string | null }>;
}
