import type { TaskAPI } from '../../interfaces/TaskAPI';
import type { ProjectTask, TaskLink, TaskNeighbourhood, NeighbourhoodNode } from '../../types';

export class DummyTaskAPI implements TaskAPI {
  private tasks: ProjectTask[] = [
    // ─── Restaurant Project ───
    { id: 'r1', projectId: 'p2', title: 'Concept Development', description: 'Define cuisine, target audience, and brand identity.', status: 'DONE', priority: 1, teamId: 't1', memberId: 'm1', createdById: 'm1', dueDate: '2026-01-10T10:00:00Z', version: 1, createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-02T12:00:00Z', totalIncomingLinksCount: 0, totalOutgoingLinksCount: 1, directIncomingLinksCount: 0, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r2', projectId: 'p2', title: 'Business Plan', description: 'Financial projections and operational strategy.', status: 'DONE', priority: 2, teamId: 't1', memberId: 'm2', createdById: 'm1', dueDate: '2026-01-15T10:00:00Z', version: 1, createdAt: '2026-01-05T10:00:00Z', updatedAt: '2026-01-06T15:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 1, directIncomingLinksCount: 1, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r3', projectId: 'p2', title: 'Secure Financing', description: 'Pitch to investors or obtain bank loan.', status: 'DONE', priority: 1, teamId: 't1', createdById: 'm2', dueDate: '2026-01-30T10:00:00Z', version: 1, createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-01-16T10:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 2, directIncomingLinksCount: 1, directOutgoingLinksCount: 2, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r4', projectId: 'p2', title: 'Legal Registration', description: 'Register LLC and obtain EIN.', status: 'DONE', priority: 3, teamId: 't2', createdById: 'm2', dueDate: '2026-02-10T10:00:00Z', version: 1, createdAt: '2026-01-20T10:00:00Z', updatedAt: '2026-01-21T09:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 1, directIncomingLinksCount: 1, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r5', projectId: 'p2', title: 'Lease Negotiation', description: 'Find a location and sign the lease.', status: 'DONE', priority: 2, teamId: 't2', createdById: 'm1', version: 1, createdAt: '2026-02-01T10:00:00Z', updatedAt: '2026-02-02T11:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 1, directIncomingLinksCount: 1, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r6', projectId: 'p2', title: 'Health Permits', description: 'Submit plans to health department.', status: 'IN_PROGRESS', priority: 1, teamId: 't2', createdById: 'm3', dueDate: '2026-04-30T10:00:00Z', version: 1, createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-04-10T10:00:00Z', totalIncomingLinksCount: 0, totalOutgoingLinksCount: 1, directIncomingLinksCount: 0, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r7', projectId: 'p2', title: 'Liquor License', description: 'Apply for state liquor board approval.', status: 'IN_PROGRESS', priority: 2, teamId: 't2', createdById: 'm3', dueDate: '2026-05-15T10:00:00Z', version: 1, createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-04-12T14:00:00Z', totalIncomingLinksCount: 0, totalOutgoingLinksCount: 1, directIncomingLinksCount: 0, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r8', projectId: 'p2', title: 'Interior Design', description: 'Layout and aesthetic design.', status: 'DONE', priority: 3, teamId: 't3', createdById: 'm1', version: 1, createdAt: '2026-02-15T10:00:00Z', updatedAt: '2026-03-01T10:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 1, directIncomingLinksCount: 1, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r9', projectId: 'p2', title: 'Renovation', description: 'Construction and utility plumbing/electrical.', status: 'IN_PROGRESS', priority: 1, teamId: 't4', createdById: 'm1', dueDate: '2026-05-01T10:00:00Z', version: 1, createdAt: '2026-03-01T10:00:00Z', updatedAt: '2026-04-15T10:00:00Z', totalIncomingLinksCount: 2, totalOutgoingLinksCount: 2, directIncomingLinksCount: 2, directOutgoingLinksCount: 2, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r10', projectId: 'p2', title: 'Hire Head Chef', description: 'Source and vet culinary leader.', status: 'DONE', priority: 2, teamId: 't1', createdById: 'm1', version: 1, createdAt: '2026-03-05T10:00:00Z', updatedAt: '2026-03-10T10:00:00Z', totalIncomingLinksCount: 0, totalOutgoingLinksCount: 2, directIncomingLinksCount: 0, directOutgoingLinksCount: 2, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r11', projectId: 'p2', title: 'Menu Design', description: 'Collaborative menu creation.', status: 'IN_PROGRESS', priority: 2, teamId: 't1', memberId: 'm3', createdById: 'm1', dueDate: '2026-04-20T10:00:00Z', version: 1, createdAt: '2026-03-10T10:00:00Z', updatedAt: '2026-04-16T10:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 1, directIncomingLinksCount: 1, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r12', projectId: 'p2', title: 'Kitchen Equipment', description: 'Ovens, walk-ins, and prep stations.', status: 'TODO', priority: 3, createdById: 'm1', version: 1, createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-15T10:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 2, directIncomingLinksCount: 1, directOutgoingLinksCount: 2, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r13', projectId: 'p2', title: 'Furniture Sourcing', description: 'Tables, chairs, and bar fixtures.', status: 'TODO', priority: 4, createdById: 'm1', version: 1, createdAt: '2026-03-20T10:00:00Z', updatedAt: '2026-03-20T10:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 0, directIncomingLinksCount: 1, directOutgoingLinksCount: 0, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r14', projectId: 'p2', title: 'Staff Recruitment', description: 'FOH and BOH general staff.', status: 'TODO', priority: 2, createdById: 'm1', version: 1, createdAt: '2026-03-25T10:00:00Z', updatedAt: '2026-03-25T10:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 1, directIncomingLinksCount: 1, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r15', projectId: 'p2', title: 'Staff Training', description: 'Service standards and POS training.', status: 'TODO', priority: 3, createdById: 'm1', version: 1, createdAt: '2026-04-01T10:00:00Z', updatedAt: '2026-04-01T10:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 1, directIncomingLinksCount: 1, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r16', projectId: 'p2', title: 'Ingredient Sourcing', description: 'Set up accounts with local suppliers.', status: 'TODO', priority: 3, createdById: 'm1', version: 1, createdAt: '2026-04-05T10:00:00Z', updatedAt: '2026-04-05T10:00:00Z', totalIncomingLinksCount: 3, totalOutgoingLinksCount: 1, directIncomingLinksCount: 3, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r17', projectId: 'p2', title: 'Website Launch', description: '', status: 'IN_PROGRESS', priority: 2, memberId: 'm1', createdById: 'm1', version: 1, createdAt: '2026-04-05T10:00:00Z', updatedAt: '2026-04-10T10:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 1, directIncomingLinksCount: 1, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r18', projectId: 'p2', title: 'Social Media Campaign', description: 'Build hype for grand opening.', status: 'TODO', priority: 3, memberId: 'm1', createdById: 'm1', version: 1, createdAt: '2026-04-07T10:00:00Z', updatedAt: '2026-04-07T10:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 0, directIncomingLinksCount: 1, directOutgoingLinksCount: 0, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r19', projectId: 'p2', title: 'Soft Opening', description: 'Invitation-only test runs.', status: 'TODO', priority: 1, createdById: 'm1', version: 1, createdAt: '2026-04-10T10:00:00Z', updatedAt: '2026-04-10T10:00:00Z', totalIncomingLinksCount: 3, totalOutgoingLinksCount: 1, directIncomingLinksCount: 3, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r20', projectId: 'p2', title: 'Grand Opening', description: 'Official public opening ceremony.', status: 'TODO', priority: 1, createdById: 'm1', version: 1, createdAt: '2026-04-15T10:00:00Z', updatedAt: '2026-04-15T10:00:00Z', totalIncomingLinksCount: 2, totalOutgoingLinksCount: 1, directIncomingLinksCount: 2, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r21', projectId: 'p2', title: 'Marketing Analysis', description: 'Review initial launch metrics.', status: 'TODO', priority: 4, createdById: 'm1', version: 1, createdAt: '2026-04-20T10:00:00Z', updatedAt: '2026-04-20T10:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 1, directIncomingLinksCount: 1, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r22', projectId: 'p2', title: 'Expansion Plan', description: 'Strategies for second location.', status: 'TODO', priority: 5, createdById: 'm1', version: 1, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-05-01T10:00:00Z', totalIncomingLinksCount: 1, totalOutgoingLinksCount: 1, directIncomingLinksCount: 1, directOutgoingLinksCount: 1, incomingLabelCounts: [], outgoingLabelCounts: [] },
    { id: 'r23', projectId: 'p2', title: 'Investor Relations', description: 'Quarterly update meeting.', status: 'TODO', priority: 2, createdById: 'm1', version: 1, createdAt: '2026-05-15T10:00:00Z', updatedAt: '2026-05-15T10:00:00Z', totalIncomingLinksCount: 2, totalOutgoingLinksCount: 0, directIncomingLinksCount: 2, directOutgoingLinksCount: 0, incomingLabelCounts: [], outgoingLabelCounts: [] },
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

  async getProjectTasks(projectId: string, first?: number, after?: string): Promise<{ tasks: ProjectTask[], hasNextPage: boolean, endCursor: string | null }> {
    const filtered = this.tasks.filter((t) => t.projectId === projectId);
    return { tasks: filtered, hasNextPage: false, endCursor: null };
  }

  async getProjectLinks(projectId: string, first?: number, after?: string): Promise<{ links: TaskLink[], hasNextPage: boolean, endCursor: string | null }> {
    const filtered = this.links.filter((l) => l.projectId === projectId);
    return { links: filtered, hasNextPage: false, endCursor: null };
  }

  async getTask(id: string): Promise<ProjectTask | null> {
    return this.tasks.find((t) => t.id === id) || null;
  }

  async getTaskNeighbourhood(projectId: string, taskId: string, maxDepth: number = 2, limit: number = 50, after?: string): Promise<TaskNeighbourhood> {
    const focusedTask = this.tasks.find((t) => t.id === taskId);
    if (!focusedTask) throw new Error('Task not found');

    const discoveredNodes = new Map<string, { task: ProjectTask; distance: number }>();
    discoveredNodes.set(taskId, { task: focusedTask, distance: 0 });

    const queue: { id: string; dist: number }[] = [{ id: taskId, dist: 0 }];
    while (queue.length > 0) {
      const { id, dist } = queue.shift()!;
      if (dist >= maxDepth) continue;

      this.links.filter(l => l.sourceTaskId === id || l.targetTaskId === id).forEach(l => {
        const neighborId = l.sourceTaskId === id ? l.targetTaskId : l.sourceTaskId;
        if (!discoveredNodes.has(neighborId)) {
          const neighborTask = this.tasks.find(t => t.id === neighborId);
          if (neighborTask) {
            discoveredNodes.set(neighborId, { task: neighborTask, distance: dist + 1 });
            queue.push({ id: neighborId, dist: dist + 1 });
          }
        }
      });
    }

    const allFoundNodes: NeighbourhoodNode[] = Array.from(discoveredNodes.values())
      .map(({ task, distance }) => {
        return { 
          task, 
          depth: distance, 
          direction: taskId === task.id ? 'both' : 'outgoing' 
        };
      });

    allFoundNodes.sort((a, b) => a.depth - b.depth);

    const startIndex = after ? parseInt(after, 10) : 0;
    const batchNodes = allFoundNodes.slice(startIndex, startIndex + limit);
    const hasNextPage = allFoundNodes.length > startIndex + limit;
    const endCursor = (startIndex + limit).toString();

    const visibleIds = [taskId, ...allFoundNodes.slice(0, startIndex + limit).map(n => n.task.id)];
    const mappedLinks = this.links.filter(l => visibleIds.includes(l.sourceTaskId) && visibleIds.includes(l.targetTaskId));

    return {
      focusedTask,
      nodes: batchNodes,
      edges: mappedLinks,
      incomingStories: [],
      outgoingStories: [],
      hasNextPage,
      endCursor,
    };
  }

  async createTask(projectId: string, title: string, description: string = ''): Promise<ProjectTask> {
    const task: ProjectTask = {
      id: `r${this.tasks.length + 1}`,
      projectId,
      title,
      description,
      status: 'TODO',
      priority: 3,
      createdById: 'm1', // Default mock creator
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalIncomingLinksCount: 0,
      totalOutgoingLinksCount: 0,
      directIncomingLinksCount: 0,
      directOutgoingLinksCount: 0,
      incomingLabelCounts: [],
      outgoingLabelCounts: [],
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
