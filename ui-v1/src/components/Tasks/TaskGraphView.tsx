import React, { useMemo } from 'react';
import { useParams, useSearch, Link } from '@tanstack/react-router';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { Loader2, Network, ArrowLeft, Info, Sparkles, Zap } from 'lucide-react';
import { TaskMap } from '../Graph/TaskMap';
import type { TaskNeighbourhood, GraphNode, GraphEdge } from '../../api/types';

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
    queryKey: ['task-neighbours-lattice-infinite', focusedTaskId],
    queryFn: ({ pageParam }) => taskApi.getTaskNeighbourLinks(focusedTaskId!, 'both', 1, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
    enabled: !!focusedTaskId,
  });

  const neighbourhood = useMemo<TaskNeighbourhood | null>(() => {
    if (!focusedTask || !neighbourPages) return null;

    const nodes: GraphNode[] = [];
    const edges: any[] = [];
    const seenIds = new Set([focusedTask.id]);

    neighbourPages.pages.forEach(page => {
      page.links.forEach(link => {
        // Source and target IDs
        const sId = link.source.id;
        const tId = link.target.id;

        // Process source node
        if (!seenIds.has(sId)) {
          nodes.push({
            task: link.source,
            direction: sId === focusedTaskId ? 'focused' : (tId === focusedTaskId ? 'incoming' : 'outgoing'),
            depth: 1
          });
          seenIds.add(sId);
        }

        // Process target node
        if (!seenIds.has(tId)) {
          nodes.push({
            task: link.target,
            direction: tId === focusedTaskId ? 'focused' : (sId === focusedTaskId ? 'outgoing' : 'incoming'),
            depth: 1
          });
          seenIds.add(tId);
        }

        // Always push the edge
        edges.push({
          id: link.id,
          source: sId,
          target: tId,
          label: link.label
        });
      });
    });

    return {
      focusedTask,
      nodes,
      edges,
      incomingStories: [],
      outgoingStories: [],
      hasNextPage: !!hasNextPage,
      endCursor: undefined // Not needed for memo
    };
  }, [focusedTask, neighbourPages, focusedTaskId, hasNextPage]);

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
