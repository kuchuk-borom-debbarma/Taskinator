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
    
    // 1. Find all ancestors (Parents, Grandparents, etc.)
    const ancestors = new Map<string, { task: ProjectTask; depth: number }>();
    let currentLevel = [taskId];
    for (let d = 1; d <= maxDepth; d++) {
      const parents: string[] = [];
      this.links
        .filter(l => currentLevel.includes(l.targetTaskId))
        .forEach(l => {
          if (!ancestors.has(l.sourceTaskId) && l.sourceTaskId !== taskId) {
            const task = this.tasks.find(t => t.id === l.sourceTaskId);
            if (task) {
              ancestors.set(l.sourceTaskId, { task, depth: d });
              parents.push(l.sourceTaskId);
            }
          }
        });
      if (parents.length === 0) break;
      currentLevel = parents;
    }

    // 2. Lateral Discovery: Find siblings (children of ancestors)
    const siblings = new Map<string, { task: ProjectTask; depth: number }>();
    ancestors.forEach((val, parentId) => {
      this.links
        .filter(l => l.sourceTaskId === parentId)
        .forEach(l => {
          // If child is NOT focus and NOT ancestor/descendant discovered yet
          if (l.targetTaskId !== taskId && !ancestors.has(l.targetTaskId)) {
            const task = this.tasks.find(t => t.id === l.targetTaskId);
            if (task) {
              // Position sibling in the column right of parent (Parent depth D -> Child depth D-1)
              siblings.set(l.targetTaskId, { task, depth: Math.max(0, val.depth - 1) });
            }
          }
        });
    });

    // 3. Find all descendants (Children, Grandchildren, etc.)
    const descendants = new Map<string, { task: ProjectTask; depth: number }>();
    currentLevel = [taskId];
    for (let d = 1; d <= maxDepth; d++) {
      const children: string[] = [];
      this.links
        .filter(l => currentLevel.includes(l.sourceTaskId))
        .forEach(l => {
          if (!descendants.has(l.targetTaskId) && l.targetTaskId !== taskId && !siblings.has(l.targetTaskId)) {
            const task = this.tasks.find(t => t.id === l.targetTaskId);
            if (task) {
              descendants.set(l.targetTaskId, { task, depth: d });
              children.push(l.targetTaskId);
            }
          }
        });
      if (children.length === 0) break;
      currentLevel = children;
    }

    // 4. Flatten into NeighbourhoodNodes
    ancestors.forEach(val => {
      nodes.push({ task: val.task, depth: val.depth, direction: 'incoming' });
    });
    siblings.forEach(val => {
      nodes.push({ task: val.task, depth: val.depth, direction: 'incoming' });
    });
    descendants.forEach(val => {
      nodes.push({ task: val.task, depth: val.depth, direction: 'outgoing' });
    });

    // 5. Edge hydration
    const allIds = [taskId, ...nodes.map((n) => n.task.id)];
    const internalLinks = this.links.filter((l) => 
      allIds.includes(l.sourceTaskId) && allIds.includes(l.targetTaskId)
    );

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
