import type { TaskAPI } from '../../interfaces/TaskAPI';
import type { ProjectTask, TaskLink, TaskNeighbourhood } from '../../types';

export class DummyTaskAPI implements TaskAPI {
  private tasks: ProjectTask[] = [
    // ─── Restaurant Project ───
    { id: 'r1', projectId: 'p2', title: 'Concept Development', description: 'Define cuisine, target audience, and brand identity.', status: 'DONE', version: 1, createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z' },
    { id: 'r2', projectId: 'p2', title: 'Business Plan', description: 'Financial projections and operational strategy.', status: 'DONE', version: 1, createdAt: '2026-01-05T10:00:00Z', updatedAt: '2026-01-05T10:00:00Z' },
    { id: 'r3', projectId: 'p2', title: 'Secure Financing', description: 'Pitch to investors or obtain bank loan.', status: 'DONE', version: 1, createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-01-15T10:00:00Z' },
    { id: 'r4', projectId: 'p2', title: 'Legal Registration', description: 'Register LLC and obtain EIN.', status: 'DONE', version: 1, createdAt: '2026-01-20T10:00:00Z', updatedAt: '2026-01-20T10:00:00Z' },
    { id: 'r5', projectId: 'p2', title: 'Lease Negotiation', description: 'Find a location and sign the lease.', status: 'DONE', version: 1, createdAt: '2026-02-01T10:00:00Z', updatedAt: '2026-02-01T10:00:00Z' },
    { id: 'r6', projectId: 'p2', title: 'Health Permits', description: 'Submit plans to health department.', status: 'IN_PROGRESS', version: 1, createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-10T10:00:00Z' },
    { id: 'r7', projectId: 'p2', title: 'Liquor License', description: 'Apply for state liquor board approval.', status: 'IN_PROGRESS', version: 1, createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-10T10:00:00Z' },
    { id: 'r8', projectId: 'p2', title: 'Interior Design', description: 'Layout and aesthetic design.', status: 'DONE', version: 1, createdAt: '2026-02-15T10:00:00Z', updatedAt: '2026-02-15T10:00:00Z' },
    { id: 'r9', projectId: 'p2', title: 'Renovation', description: 'Construction and utility plumbing/electrical.', status: 'IN_PROGRESS', version: 1, createdAt: '2026-03-01T10:00:00Z', updatedAt: '2026-03-01T10:00:00Z' },
    { id: 'r10', projectId: 'p2', title: 'Hire Head Chef', description: 'Source and vet culinary leader.', status: 'DONE', version: 1, createdAt: '2026-03-05T10:00:00Z', updatedAt: '2026-03-05T10:00:00Z' },
    { id: 'r11', projectId: 'p2', title: 'Menu Design', description: 'Collaborative menu creation.', status: 'IN_PROGRESS', version: 1, createdAt: '2026-03-10T10:00:00Z', updatedAt: '2026-03-10T10:00:00Z' },
    { id: 'r12', projectId: 'p2', title: 'Kitchen Equipment', description: 'Ovens, walk-ins, and prep stations.', status: 'TODO', version: 1, createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-15T10:00:00Z' },
    { id: 'r13', projectId: 'p2', title: 'Furniture Sourcing', description: 'Tables, chairs, and bar fixtures.', status: 'TODO', version: 1, createdAt: '2026-03-20T10:00:00Z', updatedAt: '2026-03-20T10:00:00Z' },
    { id: 'r14', projectId: 'p2', title: 'Staff Recruitment', description: 'FOH and BOH general staff.', status: 'TODO', version: 1, createdAt: '2026-03-25T10:00:00Z', updatedAt: '2026-03-25T10:00:00Z' },
    { id: 'r15', projectId: 'p2', title: 'Staff Training', description: 'Service standards and POS training.', status: 'TODO', version: 1, createdAt: '2026-04-01T10:00:00Z', updatedAt: '2026-04-01T10:00:00Z' },
    { id: 'r16', projectId: 'p2', title: 'Ingredient Sourcing', description: 'Set up accounts with local suppliers.', status: 'TODO', version: 1, createdAt: '2026-04-05T10:00:00Z', updatedAt: '2026-04-05T10:00:00Z' },
    { id: 'r17', projectId: 'p2', title: 'Website Launch', description: 'Online presence and reservations.', status: 'IN_PROGRESS', version: 1, createdAt: '2026-04-05T10:00:00Z', updatedAt: '2026-04-05T10:00:00Z' },
    { id: 'r18', projectId: 'p2', title: 'Social Media Campaign', description: 'Build hype for grand opening.', status: 'TODO', version: 1, createdAt: '2026-04-07T10:00:00Z', updatedAt: '2026-04-07T10:00:00Z' },
    { id: 'r19', projectId: 'p2', title: 'Soft Opening', description: 'Invitation-only test runs.', status: 'TODO', version: 1, createdAt: '2026-04-10T10:00:00Z', updatedAt: '2026-04-10T10:00:00Z' },
    { id: 'r20', projectId: 'p2', title: 'Grand Opening', description: 'Official public opening ceremony.', status: 'TODO', version: 1, createdAt: '2026-04-15T10:00:00Z', updatedAt: '2026-04-15T10:00:00Z' },
    { id: 'r21', projectId: 'p2', title: 'Marketing Analysis', description: 'Review initial launch metrics.', status: 'TODO', version: 1, createdAt: '2026-04-20T10:00:00Z', updatedAt: '2026-04-20T10:00:00Z' },
    { id: 'r22', projectId: 'p2', title: 'Expansion Plan', description: 'Strategies for second location.', status: 'TODO', version: 1, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-01T10:00:00Z' },
    { id: 'r23', projectId: 'p2', title: 'Investor Relations', description: 'Quarterly update meeting.', status: 'TODO', version: 1, createdAt: '2026-05-15T10:00:00Z', updatedAt: '2026-05-15T10:00:00Z' },
  ];

  private links: TaskLink[] = [
    // --- Strategic Dependencies ---
    { id: 'l1', projectId: 'p2', sourceTaskId: 'r1', targetTaskId: 'r2', label: 'Informs', createdAt: '2026-01-02T00:00:00Z' },
    { id: 'l2', projectId: 'p2', sourceTaskId: 'r2', targetTaskId: 'r3', label: 'Blocks', createdAt: '2026-01-06T00:00:00Z' },
    { id: 'l3', projectId: 'p2', sourceTaskId: 'r3', targetTaskId: 'r5', label: 'Blocks', createdAt: '2026-01-16T00:00:00Z' },
    { id: 'l4', projectId: 'p2', sourceTaskId: 'r3', targetTaskId: 'r4', label: 'Enables', createdAt: '2026-01-16T00:00:00Z' },
    
    // --- Physical & Design Dependencies ---
    { id: 'l5', projectId: 'p2', sourceTaskId: 'r5', targetTaskId: 'r8', label: 'Allows', createdAt: '2026-02-02T00:00:00Z' },
    { id: 'l6', projectId: 'p2', sourceTaskId: 'r8', targetTaskId: 'r9', label: 'Blocks', createdAt: '2026-02-16T00:00:00Z' },
    { id: 'l7', projectId: 'p2', sourceTaskId: 'r6', targetTaskId: 'r9', label: 'Required for', createdAt: '2026-02-16T00:00:00Z' },
    { id: 'l8', projectId: 'p2', sourceTaskId: 'r9', targetTaskId: 'r12', label: 'Blocks', createdAt: '2026-03-16T00:00:00Z' },
    { id: 'l9', projectId: 'p2', sourceTaskId: 'r9', targetTaskId: 'r13', label: 'Allows', createdAt: '2026-03-16T00:00:00Z' },

    // --- Operations & Culinary ---
    { id: 'l10', projectId: 'p2', sourceTaskId: 'r10', targetTaskId: 'r11', label: 'Leads', createdAt: '2026-03-06T00:00:00Z' },
    { id: 'l11', projectId: 'p2', sourceTaskId: 'r11', targetTaskId: 'r16', label: 'Informs', createdAt: '2026-03-11T00:00:00Z' },
    { id: 'l12', projectId: 'p2', sourceTaskId: 'r12', targetTaskId: 'r16', label: 'Enables', createdAt: '2026-03-16T00:00:00Z' },
    
    // --- HR & Training ---
    { id: 'l13', projectId: 'p2', sourceTaskId: 'r10', targetTaskId: 'r14', label: 'Enables', createdAt: '2026-03-06T00:00:00Z' },
    { id: 'l14', projectId: 'p2', sourceTaskId: 'r14', targetTaskId: 'r15', label: 'Blocks', createdAt: '2026-03-26T00:00:00Z' },

    // --- Marketing & Web ---
    { id: 'l15', projectId: 'p2', sourceTaskId: 'r1', targetTaskId: 'r17', label: 'Informs', createdAt: '2026-01-02T00:00:00Z' },
    { id: 'l16', projectId: 'p2', sourceTaskId: 'r17', targetTaskId: 'r18', label: 'Allows', createdAt: '2026-04-06T00:00:00Z' },
    
    // --- The Big Finale ---
    { id: 'l17', projectId: 'p2', sourceTaskId: 'r15', targetTaskId: 'r19', label: 'Blocks', createdAt: '2026-04-02T00:00:00Z' },
    { id: 'l18', projectId: 'p2', sourceTaskId: 'r16', targetTaskId: 'r19', label: 'Blocks', createdAt: '2026-04-06T00:00:00Z' },
    { id: 'l19', projectId: 'p2', sourceTaskId: 'r12', targetTaskId: 'r19', label: 'Required for', createdAt: '2026-03-16T00:00:00Z' },
    { id: 'l20', projectId: 'p2', sourceTaskId: 'r19', targetTaskId: 'r20', label: 'Blocks', createdAt: '2026-04-11T00:00:00Z' },
    { id: 'l21', projectId: 'p2', sourceTaskId: 'r7', targetTaskId: 'r20', label: 'Critical for', createdAt: '2026-02-11T00:00:00Z' },
    { id: 'l22', projectId: 'p2', sourceTaskId: 'r20', targetTaskId: 'r21', label: 'Informs', createdAt: '2026-04-16T00:00:00Z' },
    { id: 'l23', projectId: 'p2', sourceTaskId: 'r21', targetTaskId: 'r22', label: 'Leads', createdAt: '2026-04-21T00:00:00Z' },
    { id: 'l24', projectId: 'p2', sourceTaskId: 'r22', targetTaskId: 'r23', label: 'Blocks', createdAt: '2026-05-02T00:00:00Z' },
    { id: 'l25', projectId: 'p2', sourceTaskId: 'r4', targetTaskId: 'r23', label: 'Requires', createdAt: '2026-01-21T00:00:00Z' },
  ];

  async getProjectTasks(projectId: string): Promise<ProjectTask[]> {
    return this.tasks.filter((t) => t.projectId === projectId);
  }

  async getProjectLinks(projectId: string): Promise<TaskLink[]> {
    return this.links.filter((l) => l.projectId === projectId);
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
          if (l.targetTaskId !== taskId && !ancestors.has(l.targetTaskId)) {
            const task = this.tasks.find(t => t.id === l.targetTaskId);
            if (task) {
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
          if (!descendants.has(l.targetTaskId) && l.targetTaskId !== taskId) {
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

    // 4. Flatten into NeighbourhoodNodes with Descendant Priority
    // If a node is both a sibling and a descendant, it is OUTGOING
    ancestors.forEach(val => {
      nodes.push({ task: val.task, depth: val.depth, direction: 'incoming' });
    });
    siblings.forEach(val => {
      if (!descendants.has(val.task.id)) {
        nodes.push({ task: val.task, depth: val.depth, direction: 'incoming' });
      }
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
      id: `r${this.tasks.length + 1}`,
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
