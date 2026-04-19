import type { Project } from '../types';

export interface ProjectAPI {
  getProjects(first?: number, after?: string): Promise<{ projects: Project[], hasNextPage: boolean, endCursor: string | null }>;
  getProject(id: string): Promise<Project | null>;
  createProject(name: string, description?: string): Promise<Project>;
  deleteProjects(projectIds: string[]): Promise<{ success: boolean; deletedCount: number }>;
  addProjectMembers(projectId: string, userIds: string[]): Promise<{ success: boolean }>;
  removeProjectMembers(projectId: string, memberIds: string[]): Promise<{ success: boolean; removedCount: number }>;
  getProjectStats(projectId: string): Promise<{ teamCount: number; taskCount: number }>;
  getWorkspaceStats(): Promise<{ projectCount: number; teamCount: number; assignedTaskCount: number }>;
  getProjectMembers(projectId: string, first?: number, after?: string): Promise<{ members: any[], hasNextPage: boolean, endCursor: string | null }>;
}
