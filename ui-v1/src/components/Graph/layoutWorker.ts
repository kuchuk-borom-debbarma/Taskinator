import type { ProjectTask, TaskLink, NeighbourhoodNode } from '../../api/types';

// Standardized Node interface for the worker output
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
  allEdges: TaskLink[];
  layoutTime: number;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { pages, taskId, horizontalSpacing, verticalSpacing } = e.data;
  const startTime = performance.now();

  const allTasks = new Map<string, ProjectTask>();
  const edgeMap = new Map<string, TaskLink>();
  const nodeDepths = new Map<string, { depth: number, direction: string }>();

  // 1. Accumulate unique entities
  pages.forEach(p => {
    p.nodes.forEach((n: NeighbourhoodNode) => {
      allTasks.set(n.task.id, n.task);
      const existing = nodeDepths.get(n.task.id);
      if (!existing || n.depth < existing.depth) {
        nodeDepths.set(n.task.id, { depth: n.depth, direction: n.direction });
      }
    });

    p.edges.forEach((e: TaskLink) => {
      edgeMap.set(e.id, e);
    });
  });

  const nodesList = Array.from(allTasks.values());
  const allEdges = Array.from(edgeMap.values());

  // 2. Rank by Depth
  const ranks = new Map<string, number>();
  ranks.set(taskId, 0);

  nodesList.forEach(task => {
    const dInfo = nodeDepths.get(task.id);
    if (dInfo) {
      const rankValue = dInfo.direction === 'incoming' ? -dInfo.depth : dInfo.depth;
      ranks.set(task.id, rankValue);
    }
  });

  // 3. Refine disconnected (path-based propagation)
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 20) {
    changed = false;
    iterations++;
    allEdges.forEach(edge => {
      const s = ranks.get(edge.sourceTaskId);
      const t = ranks.get(edge.targetTaskId);
      if (s !== undefined && t === undefined) {
        ranks.set(edge.targetTaskId, s + 1);
        changed = true;
      } else if (t !== undefined && s === undefined) {
        ranks.set(edge.sourceTaskId, t - 1);
        changed = true;
      }
    });
  }

  // 4. Group by rank for horizontal distribution
  const byRank: Record<number, ProjectTask[]> = {};
  nodesList.forEach(task => {
    const r = ranks.get(task.id) ?? 0;
    if (!byRank[r]) byRank[r] = [];
    byRank[r].push(task);
  });

  // Sort each rank consistently
  Object.keys(byRank).forEach(r => {
    byRank[Number(r)].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  // 5. Position nodes
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
