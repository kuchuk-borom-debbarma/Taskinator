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

  async getProjects(): Promise<Project[]> {
    return [...this.projects];
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
}
