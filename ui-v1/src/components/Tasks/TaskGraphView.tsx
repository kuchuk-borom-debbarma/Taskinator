import { useMemo } from 'react';
import { Link, useParams, useSearch } from '@tanstack/react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Network } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import type { GraphEdge, GraphNode, TaskNeighbourhood } from '../../api/types';
import { EmptyState, PriorityBadge, StatusBadge, SurfaceCardStrong } from '../shared/workspace';
import { TaskMap } from '../Graph/TaskMap';

export const TaskGraphView: React.FC = () => {
  const { projectId } = useParams({ from: '/fullscreen-layout/graph/$projectId' });
  const search = useSearch({ from: '/fullscreen-layout/graph/$projectId' }) as { taskId?: string };
  const focusedTaskId = search.taskId;
  const { taskApi } = useApi();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['task-graph-page', focusedTaskId],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      return taskApi.getTaskGraphPage(focusedTaskId!, { first: 12, after: cursor });
    },
    enabled: !!focusedTaskId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.endCursor ?? undefined : undefined),
    staleTime: 1000 * 60 * 3,
  });

  const neighbourhood = useMemo<TaskNeighbourhood | null>(() => {
    const pages = data?.pages ?? [];
    const focusedTask = pages[0]?.task ?? null;
    if (!focusedTask) return null;

    const nodeMap = new Map<string, GraphNode>();
    const edgeMap = new Map<string, GraphEdge>();
    const forward = new Map<string, string[]>();
    const backward = new Map<string, string[]>();

    for (const page of pages) {
      for (const link of page.links) {
        edgeMap.set(link.id, {
          id: link.id,
          sourceTaskId: link.source.id,
          targetTaskId: link.target.id,
          label: link.label,
        });

        const sourceNode = nodeMap.get(link.source.id);
        nodeMap.set(link.source.id, {
          task: { ...link.source, description: sourceNode?.task.description ?? '', version: sourceNode?.task.version ?? 1, createdAt: sourceNode?.task.createdAt ?? '', updatedAt: sourceNode?.task.updatedAt ?? '' } as any,
          direction: sourceNode?.direction ?? 'incoming',
          depth: sourceNode?.depth ?? Number.POSITIVE_INFINITY,
        });

        const targetNode = nodeMap.get(link.target.id);
        nodeMap.set(link.target.id, {
          task: { ...link.target, description: targetNode?.task.description ?? '', version: targetNode?.task.version ?? 1, createdAt: targetNode?.task.createdAt ?? '', updatedAt: targetNode?.task.updatedAt ?? '' } as any,
          direction: targetNode?.direction ?? 'outgoing',
          depth: targetNode?.depth ?? Number.POSITIVE_INFINITY,
        });

        forward.set(link.source.id, [...(forward.get(link.source.id) ?? []), link.target.id]);
        backward.set(link.target.id, [...(backward.get(link.target.id) ?? []), link.source.id]);
      }
    }

    const incomingDepths = bfs(backward, focusedTask.id);
    const outgoingDepths = bfs(forward, focusedTask.id);

    const nodes = Array.from(nodeMap.values())
      .filter((node) => node.task.id !== focusedTask.id)
      .map((node) => {
        const incomingDepth = incomingDepths.get(node.task.id);
        const outgoingDepth = outgoingDepths.get(node.task.id);
        const direction = getNodeDirection(incomingDepth, outgoingDepth);
        const depth = Math.min(incomingDepth ?? Number.POSITIVE_INFINITY, outgoingDepth ?? Number.POSITIVE_INFINITY);

        return {
          ...node,
          direction,
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
      endCursor: pages[pages.length - 1]?.endCursor || undefined,
    };
  }, [data]);

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
    <div className="page-frame">
      <SurfaceCardStrong className="hero-gradient p-6 md:p-8">
        <div className="mb-5 flex flex-wrap gap-3">
          <Link
            to="/projects/$projectId/tasks"
            params={{ projectId }}
            className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
          >
            <ArrowLeft size={15} />
            Back to tasks
          </Link>
        </div>
        <p className="eyebrow mb-3">Flow map</p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-app-ink">{neighbourhood.focusedTask.title}</h1>
            <p className="mt-3 text-base leading-7 text-app-muted">
              The interactive task map is back, now styled to match the new workspace. Pan, zoom, and inspect the dependency web around the focused task.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={neighbourhood.focusedTask.status} />
            <PriorityBadge priority={neighbourhood.focusedTask.priority} />
          </div>
        </div>
      </SurfaceCardStrong>

      <SurfaceCardStrong className="mt-8 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-app-line px-5 py-4">
          <div>
            <p className="eyebrow mb-1">Interactive canvas</p>
            <p className="text-sm text-app-muted">Full graph view. Hover edge inspect label. Hover node isolate nearby links.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-app-muted">
            <div className="rounded-full bg-app-ink/4 px-4 py-2">
              {neighbourhood.nodes.length} connected tasks
            </div>
            <div className="rounded-full bg-app-ink/4 px-4 py-2">
              {neighbourhood.edges.length} relationships
            </div>
          </div>
        </div>
        <div className="h-[80vh] min-h-[46rem]">
          <TaskMap
            projectId={projectId}
            taskId={focusedTaskId || neighbourhood.focusedTask.id}
            neighbourhood={neighbourhood}
            fetchNextPage={hasNextPage ? fetchNextPage : undefined}
            isFetchingNextPage={isFetchingNextPage}
          />
        </div>
      </SurfaceCardStrong>
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
