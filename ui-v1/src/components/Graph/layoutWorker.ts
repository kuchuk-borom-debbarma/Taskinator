import type { ProjectTask } from '../../api/types';

export interface MapNode {
  task: ProjectTask;
  x: number;
  y: number;
  rank: number;
}

export interface WorkerInput {
  pages: any[];
  taskId: string;
  horizontalSpacing: number;
  verticalSpacing: number;
}

export interface WorkerOutput {
  nodes: MapNode[];
  allEdges: any[];
  layoutTime: number;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { pages, taskId, horizontalSpacing, verticalSpacing } = e.data;
  const startTime = performance.now();

  const allTasks = new Map<string, ProjectTask>();
  const edgeMap = new Map<string, any>();
  const nodeDepths = new Map<string, { depth: number, direction: string }>();

  pages.forEach(p => {
    if (p.focusedTask) {
      allTasks.set(p.focusedTask.id, p.focusedTask);
      if (!nodeDepths.has(p.focusedTask.id)) {
        nodeDepths.set(p.focusedTask.id, { depth: 0, direction: 'outgoing' });
      }
    }

    if (p.nodes) {
      p.nodes.forEach((n: any) => {
        allTasks.set(n.task.id, n.task);
        const existing = nodeDepths.get(n.task.id);
        if (!existing || n.depth < existing.depth) {
          nodeDepths.set(n.task.id, { depth: n.depth, direction: n.direction });
        }
      });
    }

    if (p.edges) {
      p.edges.forEach((e: any) => {
        edgeMap.set(e.id, e);
      });
    }
  });

  const nodesList = Array.from(allTasks.values());
  const allEdges = Array.from(edgeMap.values());

  const ranks = new Map<string, number>();
  ranks.set(taskId, 0);

  nodesList.forEach(task => {
    const dInfo = nodeDepths.get(task.id);
    if (dInfo) {
      const rankValue = dInfo.direction === 'incoming' ? -dInfo.depth : dInfo.depth;
      ranks.set(task.id, rankValue);
    }
  });

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 20) {
    changed = false;
    iterations++;
    allEdges.forEach(edge => {
      const sourceId = edge.sourceTaskId || (typeof edge.source === 'string' ? edge.source : edge.source?.id);
      const targetId = edge.targetTaskId || (typeof edge.target === 'string' ? edge.target : edge.target?.id);
      
      const s = ranks.get(sourceId);
      const t = ranks.get(targetId);
      if (s !== undefined && t === undefined) {
        ranks.set(targetId, s + 1);
        changed = true;
      } else if (t !== undefined && s === undefined) {
        ranks.set(sourceId, t - 1);
        changed = true;
      }
    });
  }

  const byRank: Record<number, ProjectTask[]> = {};
  nodesList.forEach(task => {
    const r = ranks.get(task.id) ?? 0;
    if (!byRank[r]) byRank[r] = [];
    byRank[r].push(task);
  });

  Object.keys(byRank).forEach(r => {
    byRank[Number(r)].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  const positionedNodes: MapNode[] = nodesList.map(task => {
    const r = ranks.get(task.id) ?? 0;
    const row = byRank[r];
    const index = row.indexOf(task);
    const x = (index - (row.length - 1) / 2) * horizontalSpacing;
    const y = r * verticalSpacing;
    return { task, x, y, rank: r };
  });

  const layoutTime = performance.now() - startTime;

  self.postMessage({
    nodes: positionedNodes,
    allEdges,
    layoutTime
  });
};
