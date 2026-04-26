import React, { useMemo } from 'react';
import { useParams, useSearch, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { Loader2, Network, ArrowLeft, Info, Sparkles, Zap } from 'lucide-react';
import { TaskMap } from '../Graph/TaskMap';
import type { TaskNeighbourhood, GraphNode, GraphEdge } from '../../api/types';

export const TaskGraphView: React.FC = () => {
  const { projectId } = useParams({ strict: false }) as any;
  const search = useSearch({ from: '/authenticated-layout/projects/$projectId/graph' }) as any;
  const focusedTaskId = search.taskId;
  const { taskApi } = useApi();

  const { data: focusedTask, isLoading: isTaskLoading } = useQuery({
    queryKey: ['task', focusedTaskId],
    queryFn: () => taskApi.getTask(focusedTaskId!),
    enabled: !!focusedTaskId,
  });

  const { data: neighbourLinksResult, isLoading: isNeighboursLoading } = useQuery({
    queryKey: ['task-neighbours-lattice', focusedTaskId],
    queryFn: () => taskApi.getTaskNeighbourLinks(focusedTaskId!, 'both', 1),
    enabled: !!focusedTaskId,
  });

  const neighbourhood = useMemo<TaskNeighbourhood | null>(() => {
    if (!focusedTask || !neighbourLinksResult) return null;

    const nodes: GraphNode[] = [];
    const edges: any[] = [];
    const seenIds = new Set([focusedTask.id]);

    neighbourLinksResult.links.forEach(link => {
      const isSource = link.source.id === focusedTaskId;
      const neighbour = isSource ? link.target : link.source;
      const direction = isSource ? 'outgoing' : 'incoming';

      if (!seenIds.has(neighbour.id)) {
        nodes.push({
          task: neighbour,
          direction: direction as any,
          depth: 1
        });
        seenIds.add(neighbour.id);
      }

      edges.push({
        id: link.id,
        source: link.source.id,
        target: link.target.id,
        label: link.label
      });
    });

    return {
      focusedTask,
      nodes,
      edges,
      incomingStories: [],
      outgoingStories: [],
      hasNextPage: false
    };
  }, [focusedTask, neighbourLinksResult, focusedTaskId]);

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
    <div className="flex-1 w-full h-[calc(100vh-64px)] relative bg-[#0B0F1A] overflow-hidden">
      <TaskMap 
        projectId={projectId || ''} 
        taskId={focusedTaskId || ''} 
        neighbourhood={neighbourhood} 
      />

      {/* Modern UI Overlays */}
      <div className="absolute top-8 left-8 flex flex-col gap-5 z-50 pointer-events-none">
        <div className="p-6 rounded-[32px] border border-white/10 bg-[#111827]/80 backdrop-blur-2xl shadow-premium flex flex-col gap-4 min-w-[320px] pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#3b82f6]/10 flex items-center justify-center border border-[#3b82f6]/20">
                <Sparkles size={20} className="text-[#3b82f6]" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white tracking-tight">Discovery Engine</h2>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Nexus Bridge v2.0</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-4 mt-2 flex flex-col gap-2">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Active Perspective</span>
            <div className="flex items-center gap-3">
               <div className={`w-3 h-3 rounded-full ${focusedTask.status === 'DONE' ? 'bg-[#10b981]' : focusedTask.status === 'IN_PROGRESS' ? 'bg-[#3b82f6]' : 'bg-[#64748b]'}`} />
               <p className="text-[14px] font-black text-white line-clamp-1">{focusedTask.title}</p>
            </div>
          </div>
        </div>

        <Link 
          to="/projects/$projectId/tasks/$taskId"
          params={{ projectId: projectId || '', taskId: focusedTaskId || '' }}
          className="group flex items-center justify-between px-6 py-4 bg-[#111827]/80 backdrop-blur-2xl border border-white/10 rounded-3xl text-[12px] font-black text-white/40 hover:text-white hover:border-[#3b82f6]/40 transition-all shadow-premium pointer-events-auto"
        >
          <div className="flex items-center gap-3">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>EXIT GRAPH</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 font-bold uppercase tracking-tighter ml-4">ESC</span>
        </Link>
      </div>

      <div className="absolute bottom-8 left-8 flex items-center gap-4 px-6 py-3 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-full text-[11px] font-black text-[#3b82f6] backdrop-blur-2xl shadow-lg uppercase tracking-[0.2em] z-50">
        <Zap size={16} />
        Low Latency Discovery Active
      </div>
      
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress {
          animation: progress 2s infinite linear;
        }
      `}</style>
    </div>
  );
};
