import React, { useMemo, useEffect, useState } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParams, useSearch, Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { Loader2, Network, Info, ArrowLeft, AlertCircle } from 'lucide-react';

const nodeStyles = {
  TODO: 'bg-slate-800 border-slate-700 text-slate-400',
  IN_PROGRESS: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
  DONE: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
};

export const TaskGraphView: React.FC = () => {
  const { projectId } = useParams({ strict: false }) as any;
  const search = useSearch({ from: '/authenticated-layout/projects/$projectId/graph' }) as any;
  const focusedTaskId = search.taskId;
  const { taskApi } = useApi();
  const navigate = useNavigate();

  // Redirect if no taskId is provided (as we only support focused view now)
  useEffect(() => {
    if (!focusedTaskId) {
      navigate({ to: `/projects/${projectId}/tasks` });
    }
  }, [focusedTaskId, projectId, navigate]);

  const { data: focusedTask, isLoading: isTaskLoading } = useQuery({
    queryKey: ['task', focusedTaskId],
    queryFn: () => taskApi.getTask(focusedTaskId!),
    enabled: !!focusedTaskId,
  });

  const { data: neighbourLinks, isLoading: isNeighboursLoading } = useQuery({
    queryKey: ['task-neighbours', focusedTaskId],
    queryFn: () => taskApi.getTaskNeighbourLinks(focusedTaskId!, 'both', 1),
    enabled: !!focusedTaskId,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (focusedTaskId && focusedTask && neighbourLinks) {
      // Focused View Layout (Radial/Star)
      const centerNode = {
        id: focusedTask.id,
        data: { label: focusedTask.title },
        position: { x: 0, y: 0 },
        className: `px-6 py-3 rounded-2xl border-4 text-[13px] font-black shadow-2xl transition-all scale-110 z-10 ${nodeStyles[focusedTask.status as keyof typeof nodeStyles] || 'bg-slate-800'} border-focus-blue/50`,
      };

      const neighbourNodes = neighbourLinks.links.map((link, i) => {
        const linkedTask = link.source.id === focusedTaskId ? link.target : link.source;
        const angle = (i / neighbourLinks.links.length) * Math.PI * 2;
        const radius = 300;
        return {
          id: linkedTask.id,
          data: { label: linkedTask.title },
          position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
          className: `px-4 py-2 rounded-xl border-2 text-[11px] font-bold shadow-xl transition-all ${nodeStyles[linkedTask.status as keyof typeof nodeStyles] || 'bg-slate-800'}`,
        };
      });

      // Deduplicate nodes
      const allNodes = [centerNode];
      const seenIds = new Set([focusedTaskId]);
      neighbourNodes.forEach(n => {
        if (!seenIds.has(n.id)) {
          allNodes.push(n);
          seenIds.add(n.id);
        }
      });

      const allEdges = neighbourLinks.links.map(link => ({
        id: link.id,
        source: link.source.id,
        target: link.target.id,
        label: link.label,
        animated: true,
        style: { stroke: link.source.id === focusedTaskId ? '#3b82f6' : '#475569', strokeWidth: 2 },
        labelStyle: { fill: '#94a3b8', fontSize: 9, fontWeight: 700 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
      }));

      setNodes(allNodes as any);
      setEdges(allEdges as any);
    }
  }, [focusedTaskId, focusedTask, neighbourLinks, setNodes, setEdges]);

  if (isTaskLoading || isNeighboursLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#0B0F1A]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">Focusing Task Neighbourhood...</span>
      </div>
    );
  }

  if (!focusedTaskId) return null;

  return (
    <div className="flex-1 w-full h-full relative bg-[#0B0F1A]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        colorMode="dark"
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls className="bg-slate-900 border-slate-800" />
        <MiniMap 
          className="bg-slate-900 border-slate-800" 
          nodeColor={(n) => {
            if (n.className?.includes('text-blue-400')) return '#3b82f6';
            if (n.className?.includes('text-emerald-400')) return '#10b981';
            return '#475569';
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
        />
        
        <Panel position="top-left" className="m-4 flex flex-col gap-3">
          <div className="glass-panel-dark p-4 rounded-2xl border border-white/10 flex flex-col gap-2 min-w-[240px]">
            <div className="flex items-center gap-2 text-white">
              <Network size={16} className="text-blue-400" />
              <h2 className="text-sm font-bold tracking-tight">Dependency Neighbourhood</h2>
            </div>
            <div className="text-[11px] font-medium text-white/40 line-clamp-1 border-t border-white/5 pt-2 mt-1 italic">
              Focused on: {focusedTask?.title}
            </div>
            <div className="flex items-center gap-4 mt-1 border-t border-white/5 pt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase">Todo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase">Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase">Done</span>
              </div>
            </div>
          </div>

          <Link 
            to="/projects/$projectId/tasks/$taskId"
            params={{ projectId, taskId: focusedTaskId }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-[11px] font-bold text-white/60 hover:text-white transition-all shadow-xl"
          >
            <ArrowLeft size={14} />
            Back to Task Detail
          </Link>
        </Panel>

        <Panel position="bottom-right" className="m-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold text-blue-400 backdrop-blur-md">
            <Info size={12} />
            Exploring direct impacts and dependencies
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};
