import type { ProjectAPI } from '../../interfaces/ProjectAPI';
import type { Project } from '../../types';

export class DummyProjectAPI implements ProjectAPI {
  private projects: Project[] = [
    {
      id: 'p1',
      name: 'Taskinator V2',
      description: 'Building the next-gen orchestration engine.',
      createdAt: new Date().toISOString(),
      version: 1,
    },
    {
      id: 'p2',
      name: 'Dependency Discovery Service',
      description: 'The graph-based task relationship implementation.',
      createdAt: new Date().toISOString(),
      version: 1,
    },
  ];

  async getProjects(): Promise<{ projects: Project[], hasNextPage: boolean, endCursor: string | null }> {
    return {
      projects: [...this.projects],
      hasNextPage: false,
      endCursor: null,
    };
  }

  async getProject(id: string): Promise<Project | null> {
    return this.projects.find((p) => p.id === id) || null;
  }

  async createProject(name: string, description?: string): Promise<Project> {
    const newProject: Project = {
      id: `p${this.projects.length + 1}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      version: 1,
    };
    this.projects.push(newProject);
    return newProject;
  }

  async addProjectMembers(_projectId: string, _userIds: string[]): Promise<{ success: boolean }> {
    return { success: true };
  }

  async removeProjectMembers(_projectId: string, _memberIds: string[]): Promise<{ success: boolean; removedCount: number }> {
    return { success: true, removedCount: _memberIds.length };
  }

  async getProjectStats(projectId: string): Promise<{ teamCount: number; taskCount: number }> {
    const counts: Record<string, { t: number, sc: number }> = {
      p1: { t: 2, sc: 15 },
      p2: { t: 4, sc: 23 },
    };
    const c = counts[projectId] || { t: 0, sc: 0 };
    return { teamCount: c.t, taskCount: c.sc };
  }

  async getWorkspaceStats(): Promise<{ projectCount: number; teamCount: number; assignedTaskCount: number }> {
    return {
      projectCount: this.projects.length,
      teamCount: 6,
      assignedTaskCount: 38
    };
  }
}
