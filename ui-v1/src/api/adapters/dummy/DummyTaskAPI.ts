import type { TaskAPI } from '../../interfaces/TaskAPI';
import type { ProjectTask, TaskLink, TaskNeighbourhood } from '../../types';

export class DummyTaskAPI implements TaskAPI {
  private tasks: ProjectTask[] = [
    {
      id: 't1',
      projectId: 'p1',
      title: 'Initial Research',
      description: 'Research the core architecture.',
      status: 'DONE',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 't2',
      projectId: 'p1',
      title: 'Bootstrap Project',
      description: 'Initialize Vite and backend.',
      status: 'DONE',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 't3',
      projectId: 'p1',
      title: 'Implement Task Table',
      description: 'Define SQL schema and types.',
      status: 'IN_PROGRESS',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 't4',
      projectId: 'p1',
      title: 'Graph Discovery Logic',
      description: 'Implement radial discovery query.',
      status: 'TODO',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 't5',
      projectId: 'p1',
      title: 'Interactive Graph Canvas',
      description: 'Build the interactive dependency graph.',
      status: 'TODO',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private links: TaskLink[] = [
    { id: 'l1', projectId: 'p1', sourceTaskId: 't1', targetTaskId: 't2', label: 'Blocks', createdAt: new Date().toISOString() },
    { id: 'l2', projectId: 'p1', sourceTaskId: 't2', targetTaskId: 't3', label: 'Blocks', createdAt: new Date().toISOString() },
    { id: 'l3', projectId: 'p1', sourceTaskId: 't2', targetTaskId: 't4', label: 'Blocks', createdAt: new Date().toISOString() },
    { id: 'l4', projectId: 'p1', sourceTaskId: 't4', targetTaskId: 't5', label: 'Blocks', createdAt: new Date().toISOString() },
  ];

  async getProjectTasks(projectId: string): Promise<ProjectTask[]> {
    return this.tasks.filter((t) => t.projectId === projectId);
  }

  async getTask(id: string): Promise<ProjectTask | null> {
    return this.tasks.find((t) => t.id === id) || null;
  }

  async getTaskNeighbourhood(taskId: string, maxDepth: number = 2): Promise<TaskNeighbourhood> {
    const focusedTask = this.tasks.find((t) => t.id === taskId);
    if (!focusedTask) throw new Error('Task not found');

    const nodes: any[] = [];
    const internalLinks: TaskLink[] = [];

    // Simple BFS for dummy neighbourhood
    const queue = [{ id: taskId, depth: 0 }];
    const visited = new Set([taskId]);

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const children = this.links
        .filter((l) => l.sourceTaskId === id)
        .map((l) => ({ id: l.targetTaskId, direction: 'outgoing' as const }));
      
      const parents = this.links
        .filter((l) => l.targetTaskId === id)
        .map((l) => ({ id: l.sourceTaskId, direction: 'incoming' as const }));

      [...children, ...parents].forEach(({ id: targetId, direction }) => {
        if (!visited.has(targetId)) {
          visited.add(targetId);
          const task = this.tasks.find((t) => t.id === targetId);
          if (task) {
            nodes.push({ task, depth: depth + 1, direction });
            queue.push({ id: targetId, depth: depth + 1 });
          }
        }
      });
    }

    // Edge hydration
    const allIds = [taskId, ...nodes.map((n) => n.task.id)];
    this.links.forEach((l) => {
      if (allIds.includes(l.sourceTaskId) && allIds.includes(l.targetTaskId)) {
        internalLinks.push(l);
      }
    });

    return {
      focusedTask,
      nodes,
      edges: internalLinks,
      hasNextPage: false,
    };
  }

  async createTask(projectId: string, title: string, description: string = ''): Promise<ProjectTask> {
    const task: ProjectTask = {
      id: `t${this.tasks.length + 1}`,
      projectId,
      title,
      description,
      status: 'TODO',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.push(task);
    return task;
  }

  async updateTask(taskId: string, updates: Partial<ProjectTask>): Promise<ProjectTask> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    return task;
  }

  async createTaskLink(projectId: string, sourceId: string, targetId: string, label: string): Promise<TaskLink> {
    const link: TaskLink = {
      id: `l${this.links.length + 1}`,
      projectId,
      sourceTaskId: sourceId,
      targetTaskId: targetId,
      label,
      createdAt: new Date().toISOString(),
    };
    this.links.push(link);
    return link;
  }
}
