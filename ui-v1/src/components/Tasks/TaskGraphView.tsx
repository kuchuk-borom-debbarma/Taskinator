import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2, Network } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { GraphEdge, GraphNode, ProjectTask, TaskNeighbourhood } from '../../api/types';
import { EmptyState } from '../shared/workspace';
import { TaskMap } from '../Graph/TaskMap';

interface TaskGraphViewProps {
  projectId: string;
  focusedTaskId?: string;
}

export const TaskGraphView: React.FC<TaskGraphViewProps> = ({ projectId, focusedTaskId }) => {
  const { taskApi } = useApi();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['task-graph-page', focusedTaskId],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      return taskApi.getTaskGraphPage(focusedTaskId!, { first: 10, after: cursor });
    },
    enabled: !!focusedTaskId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.pageInfo?.hasNextPage ? lastPage.pageInfo.endCursor ?? undefined : undefined),
    staleTime: 1000 * 60 * 3,
  });

  const neighbourhood = useMemo<TaskNeighbourhood | null>(() => {
    const pages = data?.pages ?? [];
    const focusedTask = pages[0]?.task ?? null;
    if (!focusedTask) return null;

    const nodeMap = new Map<string, GraphNode>();
    const edgeMap = new Map<string, GraphEdge>();
    const incomingDepths = new Map<string, number>();
    const outgoingDepths = new Map<string, number>();

    for (const page of pages) {
      for (const link of page.links) {
        edgeMap.set(link.id, {
          id: link.id,
          sourceTaskId: link.source.id,
          targetTaskId: link.target.id,
          label: link.label,
        });

        nodeMap.set(link.source.id, {
          task: toGraphTask(link.source, nodeMap.get(link.source.id)?.task),
          direction: 'incoming',
          depth: incomingDepths.get(link.source.id) ?? 1,
        });

        nodeMap.set(link.target.id, {
          task: toGraphTask(link.target, nodeMap.get(link.target.id)?.task),
          direction: 'outgoing',
          depth: outgoingDepths.get(link.target.id) ?? 1,
        });
      }
    }

    const incomingAdjacency = new Map<string, string[]>();
    const outgoingAdjacency = new Map<string, string[]>();

    for (const edge of edgeMap.values()) {
      incomingAdjacency.set(
        edge.targetTaskId,
        dedupe([...(incomingAdjacency.get(edge.targetTaskId) ?? []), edge.sourceTaskId])
      );
      outgoingAdjacency.set(
        edge.sourceTaskId,
        dedupe([...(outgoingAdjacency.get(edge.sourceTaskId) ?? []), edge.targetTaskId])
      );
    }

    const traversedIncoming = bfs(incomingAdjacency, focusedTask.id);
    const traversedOutgoing = bfs(outgoingAdjacency, focusedTask.id);

    const nodes = Array.from(nodeMap.values())
      .filter((node) => node.task.id !== focusedTask.id)
      .map((node) => {
        const incomingDepth = traversedIncoming.get(node.task.id);
        const outgoingDepth = traversedOutgoing.get(node.task.id);
        const dir = getNodeDirection(incomingDepth, outgoingDepth);
        const depth = Math.min(incomingDepth ?? Number.POSITIVE_INFINITY, outgoingDepth ?? Number.POSITIVE_INFINITY);

        return {
          ...node,
          direction: dir,
          depth: Number.isFinite(depth) ? depth : 1,
        };
      })
      .sort((a, b) => {
        if ((a.depth ?? 0) !== (b.depth ?? 0)) {
          return (a.depth ?? 0) - (b.depth ?? 0);
        }
        return a.task.title.localeCompare(b.task.title);
      });

    return {
      focusedTask,
      nodes,
      edges: Array.from(edgeMap.values()),
      incomingStories: [],
      outgoingStories: [],
      hasNextPage: !!hasNextPage,
      endCursor: pages[pages.length - 1]?.pageInfo?.endCursor || undefined,
    };
  }, [data, hasNextPage]);

  if (isLoading) {
    return (
      <div className="page-frame">
        <div className="flex min-h-[18rem] items-center justify-center">
          <Loader2 size={28} className="animate-spin text-app-accent" />
        </div>
      </div>
    );
  }

  if (!neighbourhood) {
    return (
      <div className="page-frame">
        <EmptyState
          icon={Network}
          title="No flow context yet"
          description="Open the graph from a task detail page so the focus task is defined."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full w-full bg-app-bg">
      <TaskMap
        projectId={projectId}
        taskId={focusedTaskId || neighbourhood.focusedTask.id}
        neighbourhood={neighbourhood}
        fetchNextPage={hasNextPage ? fetchNextPage : undefined}
        isFetchingNextPage={isFetchingNextPage}
      />
    </div>
  );
};

function bfs(adjacency: Map<string, string[]>, startId: string) {
  const depths = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
  depths.set(startId, 0);

  while (queue.length) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current.id) ?? [];

    for (const neighborId of neighbors) {
      if (depths.has(neighborId)) continue;
      depths.set(neighborId, current.depth + 1);
      queue.push({ id: neighborId, depth: current.depth + 1 });
    }
  }

  depths.delete(startId);
  return depths;
}

function getNodeDirection(incomingDepth?: number, outgoingDepth?: number): GraphNode['direction'] {
  if (incomingDepth !== undefined && outgoingDepth !== undefined) {
    if (incomingDepth < outgoingDepth) return 'incoming';
    if (outgoingDepth < incomingDepth) return 'outgoing';
    return 'both';
  }

  if (incomingDepth !== undefined) return 'incoming';
  if (outgoingDepth !== undefined) return 'outgoing';
  return 'both';
}

function toGraphTask(task: Partial<ProjectTask> & { id: string; title: string; status: ProjectTask['status']; priority: number }, existing?: ProjectTask): ProjectTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? existing?.description ?? '',
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? existing?.dueDate,
    project: task.project ?? existing?.project,
    team: task.team ?? existing?.team,
    assignedMember: task.assignedMember ?? existing?.assignedMember,
    createdBy: task.createdBy ?? existing?.createdBy,
    updatedBy: task.updatedBy ?? existing?.updatedBy,
    version: task.version ?? existing?.version ?? 1,
    lastEventId: task.lastEventId ?? existing?.lastEventId,
    createdAt: task.createdAt ?? existing?.createdAt ?? '',
    updatedAt: task.updatedAt ?? existing?.updatedAt ?? '',
  };
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}
