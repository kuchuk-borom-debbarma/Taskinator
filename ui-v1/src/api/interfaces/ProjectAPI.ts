import type { PageInfo, PaginationArgs, Project, ProjectMember, ProjectTask, TaskLink, Team } from '../types';

export interface ProjectAPI {
  getProjects(pagination?: PaginationArgs): Promise<{ projects: Project[], pageInfo: PageInfo, totalCount?: number }>;
  getProject(id: string): Promise<Project | null>;
  createProject(name: string, description?: string): Promise<Project>;
  updateProject(id: string, version: number, name?: string, description?: string): Promise<Project>;
  deleteProjects(projectIds: string[]): Promise<{ success: boolean; deletedCount: number }>;
  addProjectMembers(projectId: string, userIds: string[]): Promise<{ success: boolean }>;
  removeProjectMembers(projectId: string, memberIds: string[]): Promise<{ success: boolean }>;
  getProjectMembers(projectId: string, pagination?: PaginationArgs & { search?: string }): Promise<{ members: ProjectMember[], pageInfo: PageInfo }>;
  getProjectLinks(projectId: string, pagination?: PaginationArgs): Promise<{ links: any[], pageInfo: PageInfo }>;
  getProjectDashboardData(projectId: string): Promise<{
    project: Project | null,
    teams: Team[],
    tasks: ProjectTask[],
    members: ProjectMember[],
    links: TaskLink[],
  }>;
}
