import React, { useMemo } from 'react';
import { useParams, useSearch, Link } from '@tanstack/react-router';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { Loader2, ArrowLeft, Zap } from 'lucide-react';
import { TaskMap } from '../Graph/TaskMap';
import type { TaskNeighbourhood, GraphNode, GraphEdge } from '../../api/types';

const getNodeDirection = (
  incomingDepth: number | undefined,
  outgoingDepth: number | undefined
): GraphNode['direction'] => {
  if (incomingDepth !== undefined && outgoingDepth !== undefined) {
    if (incomingDepth < outgoingDepth) return 'incoming';
    if (outgoingDepth < incomingDepth) return 'outgoing';
    return 'both';
  }

  if (incomingDepth !== undefined) return 'incoming';
  return 'outgoing';
};

export const TaskGraphView: React.FC = () => {
  const { projectId } = useParams({ from: '/fullscreen-layout/graph/$projectId' });
  const search = useSearch({ from: '/fullscreen-layout/graph/$projectId' }) as any;
  const focusedTaskId = search.taskId;
  const { taskApi } = useApi();

  const { data: focusedTask, isLoading: isTaskLoading } = useQuery({
    queryKey: ['task', focusedTaskId],
    queryFn: () => taskApi.getTask(focusedTaskId!),
    enabled: !!focusedTaskId,
  });

  const { 
    data: neighbourPages, 
    isLoading: isNeighboursLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['task-neighbours-by-cursor', focusedTaskId],
    queryFn: ({ pageParam }) => {
      const cursorParam = pageParam as { cursor?: string; direction?: 'forward' | 'backward' } | undefined;
      const isBackward = cursorParam?.direction === 'backward';

      return taskApi.getTaskNeighbourLinks(
        focusedTaskId!,
        'both',
        undefined,
        isBackward ? undefined : 50,
        isBackward ? undefined : cursorParam?.cursor,
        isBackward ? 50 : undefined,
        isBackward ? cursorParam?.cursor : undefined
      );
    },
    initialPageParam: undefined as { cursor?: string; direction?: 'forward' | 'backward' } | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? { direction: 'forward' as const, cursor: lastPage.endCursor! } : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage.hasPreviousPage ? { direction: 'backward' as const, cursor: firstPage.startCursor! } : undefined,
    enabled: !!focusedTaskId,
  });

  const neighbourhood = useMemo<TaskNeighbourhood | null>(() => {
    if (!focusedTask || !neighbourPages) return null;

    const taskMap = new Map<string, typeof focusedTask>([[focusedTask.id, focusedTask]]);
    const nodeMap = new Map<string, GraphNode>();
    const edgeMap = new Map<string, GraphEdge & { source: string; target: string }>();
    const outgoingAdj = new Map<string, Set<string>>();
    const incomingAdj = new Map<string, Set<string>>();

    const pushAdjacency = (map: Map<string, Set<string>>, from: string, to: string) => {
      const existing = map.get(from);
      if (existing) {
        existing.add(to);
        return;
      }
      map.set(from, new Set([to]));
    };

    neighbourPages.pages.forEach((page) => {
      page.links.forEach((link) => {
        taskMap.set(link.source.id, link.source);
        taskMap.set(link.target.id, link.target);

        edgeMap.set(link.id, {
          id: link.id,
          source: link.source.id,
          target: link.target.id,
          sourceTaskId: link.source.id,
          targetTaskId: link.target.id,
          label: link.label,
        });

        pushAdjacency(outgoingAdj, link.source.id, link.target.id);
        pushAdjacency(incomingAdj, link.target.id, link.source.id);
      });
    });

    const bfs = (adjacency: Map<string, Set<string>>) => {
      const depths = new Map<string, number>();
      const queue: string[] = [focusedTask.id];
      depths.set(focusedTask.id, 0);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDepth = depths.get(current)!;
        const nextNodes = adjacency.get(current);
        if (!nextNodes) continue;

        nextNodes.forEach((nextNodeId) => {
          if (depths.has(nextNodeId)) return;
          depths.set(nextNodeId, currentDepth + 1);
          queue.push(nextNodeId);
        });
      }

      return depths;
    };

    const outgoingDepths = bfs(outgoingAdj);
    const incomingDepths = bfs(incomingAdj);

    taskMap.forEach((task, taskId) => {
      if (taskId === focusedTask.id) return;

      const incomingDepth = incomingDepths.get(taskId);
      const outgoingDepth = outgoingDepths.get(taskId);
      if (incomingDepth === undefined && outgoingDepth === undefined) return;

      const availableDepths = [incomingDepth, outgoingDepth].filter((value): value is number => value !== undefined);
      const depth = Math.min(...availableDepths);

      nodeMap.set(taskId, {
        task,
        direction: getNodeDirection(incomingDepth, outgoingDepth),
        depth,
      });
    });

    return {
      focusedTask,
      nodes: Array.from(nodeMap.values()).sort((a, b) => {
        if ((a.depth || 0) !== (b.depth || 0)) return (a.depth || 0) - (b.depth || 0);
        return new Date(b.task.createdAt).getTime() - new Date(a.task.createdAt).getTime();
      }),
      edges: Array.from(edgeMap.values()),
      incomingStories: [],
      outgoingStories: [],
      hasNextPage: !!hasNextPage,
      endCursor: neighbourPages.pages[neighbourPages.pages.length - 1]?.endCursor || undefined
    };
  }, [focusedTask, neighbourPages, hasNextPage]);

  if (isTaskLoading || isNeighboursLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-[#0B0F1A]">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-[#3b82f6] opacity-20" />
          <Zap className="absolute inset-0 m-auto w-6 h-6 text-[#3b82f6] animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-[12px] font-black text-white uppercase tracking-[0.5em]">Initialising Nexus Bridge</span>
          <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-[#3b82f6] animate-progress" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!neighbourhood || !focusedTask) return null;

  return (
    <div className="flex-1 w-full h-screen relative bg-[#0B0F1A] overflow-hidden">
      {/* Floating Back Button */}
      <div className="absolute top-8 left-8 z-50">
        <Link 
          to="/projects/$projectId/tasks" 
          params={{ projectId }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111827]/80 border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all backdrop-blur-xl group shadow-2xl"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Back to Workspace</span>
        </Link>
      </div>

      <TaskMap 
        projectId={projectId || ''} 
        taskId={focusedTaskId || ''} 
        neighbourhood={neighbourhood} 
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </div>
  );
};
