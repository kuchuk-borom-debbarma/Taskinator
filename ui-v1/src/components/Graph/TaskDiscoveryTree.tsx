import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useApi } from '../../context/ApiContext';
import { getLinkLabelColor } from '../../utils/color';
import { PlusCircle, Loader2, Target, Zap } from 'lucide-react';
import type { ProjectTask } from '../../api/types';

interface TaskDiscoveryTreeProps {
  taskId: string;
}

interface DiscoveryGroup {
  label: string;
  tasks: ProjectTask[];
  color: string;
}

export const TaskDiscoveryTree: React.FC<TaskDiscoveryTreeProps> = ({ taskId }) => {
  const { taskApi } = useApi();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const focusNodeRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Record<string, DOMRect>>({});

  // 1. Infinite Discovery Engine
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['neighbourhood-infinite', taskId],
    queryFn: ({ pageParam }) => taskApi.getTaskNeighbourhood(taskId, 50, 10, pageParam),
    initialPageParam: '0',
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  // 2. Data Aggregation & Matrix Generation
  const orchard = useMemo(() => {
    if (!data) return null;

    const focusedTask = data.pages[0].focusedTask;
    const allNodes = data.pages.flatMap(p => p.nodes);
    const allEdges = data.pages.flatMap(p => p.edges);

    const maxDepthL = Math.max(0, ...allNodes.filter(n => n.direction === 'incoming').map(n => n.depth));
    const maxDepthR = Math.max(0, ...allNodes.filter(n => n.direction === 'outgoing').map(n => n.depth));

    const keys: string[] = [];
    for (let i = maxDepthL; i >= 1; i--) keys.push(`L${i}`);
    keys.push('C');
    for (let i = 1; i <= maxDepthR; i++) keys.push(`R${i}`);

    const levels: Record<string, DiscoveryGroup[]> = {};
    keys.forEach(k => levels[k] = []);

    // Center Node
    levels['C'].push({ label: 'Focus Node', tasks: [focusedTask], color: '#2563eb' });

    // Grouping
    const grouped: Record<string, Record<string, ProjectTask[]>> = {};
    allNodes.forEach(n => {
      const sidePrefix = n.direction === 'incoming' ? 'L' : 'R';
      const key = `${sidePrefix}${n.depth}`;
      if (!levels[key]) return;
      
      if (!grouped[key]) grouped[key] = {};
      const link = allEdges.find(e => 
        (n.direction === 'incoming' && e.sourceTaskId === n.task.id) ||
        (n.direction === 'outgoing' && e.targetTaskId === n.task.id)
      );
      const label = link?.label || 'Linked';
      if (!grouped[key][label]) grouped[key][label] = [];
      grouped[key][label].push(n.task);
    });

    Object.entries(grouped).forEach(([lvl, labelMap]) => {
      Object.entries(labelMap).forEach(([label, tasks]) => {
        levels[lvl].push({ label, tasks, color: getLinkLabelColor(label) });
      });
    });

    return { levels, keys, allEdges, focusedTask, nodeCount: allNodes.length };
  }, [data]);

  const scrollToFocus = (behavior: ScrollBehavior = 'smooth') => {
    if (focusNodeRef.current) {
      focusNodeRef.current.scrollIntoView({ 
        behavior, 
        inline: 'center',
        block: 'nearest'
      });
    }
  };

  // Auto-centering: Only on initial load or task change
  useEffect(() => {
    if (orchard && !isLoading) {
      // 100ms delay to ensure DOM is fully painted for horizontal scroll calculation
      const timer = setTimeout(() => scrollToFocus('smooth'), 100);
      return () => clearTimeout(timer);
    }
  }, [taskId, !!orchard, isLoading]); 

  // 3. Rect Tracking for SVG
  useEffect(() => {
    const updateRects = () => {
      if (!containerRef.current) return;
      const newRects: Record<string, DOMRect> = {};
      const containerRect = containerRef.current.getBoundingClientRect();

      containerRef.current.querySelectorAll('[data-task-id]').forEach(el => {
        const id = el.getAttribute('data-task-id');
        const rect = el.getBoundingClientRect();
        newRects[id!] = {
          ...rect,
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
        } as DOMRect;
      });
      setRects(newRects);
    };

    const timer = setTimeout(updateRects, 200);
    window.addEventListener('resize', updateRects);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRects);
    }
  }, [orchard]);

  const linkedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (hoveredNodeId && orchard) {
      set.add(hoveredNodeId);
      orchard.allEdges.forEach(e => {
        if (e.sourceTaskId === hoveredNodeId) set.add(e.targetTaskId);
        if (e.targetTaskId === hoveredNodeId) set.add(e.sourceTaskId);
      });
    }
    return set;
  }, [hoveredNodeId, orchard]);

  if (isLoading) return <div className="p-20 text-center text-text-dim/40 font-black uppercase tracking-[0.3em] animate-pulse">Orchestrating Matrix...</div>;
  if (isError || !orchard) return <div className="p-20 text-center text-incoming font-bold">Lineage manifestation halted.</div>;

  const renderTaskCard = (task: ProjectTask, isFocus = false) => {
    const isActuallyDimmed = hoveredNodeId && !linkedNodeIds.has(task.id);
    const linkedStatusColor = task.status === 'DONE' ? 'var(--color-done)' : task.status === 'IN_PROGRESS' ? 'var(--color-incoming)' : 'var(--color-todo)';
    
    return (
      <div 
        key={task.id}
        ref={isFocus ? focusNodeRef : null}
        data-task-id={task.id}
        onMouseEnter={() => setHoveredNodeId(task.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
        className={`
          flex flex-col gap-2 p-4 rounded-3xl border transition-all duration-500
          ${isFocus 
            ? 'w-72 bg-white border-focus-blue shadow-premium ring-[12px] ring-focus-blue/5 scale-105 z-10' 
            : 'w-60 bg-white/80 backdrop-blur-md border-border-notion hover:border-text-dim hover:shadow-xl hover:-translate-y-1'
          }
          ${isActuallyDimmed ? 'opacity-[0.08] grayscale scale-95 blur-[1px]' : 'opacity-100'}
        `}
      >
        <Link 
          to="/projects/$projectId/tasks/$taskId" 
          params={{ projectId: task.projectId, taskId: task.id }}
          className="group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white`} style={{ backgroundColor: linkedStatusColor }}>
              {task.status}
            </div>
            <Zap size={12} className={isFocus ? 'text-focus-blue' : 'text-text-dim opacity-30'} />
          </div>
          <p className={`leading-tight font-black text-text-notion group-hover:text-focus-blue transition-colors ${isFocus ? 'text-[16px]' : 'text-[13px]'}`}>
            {task.title}
          </p>
          {isFocus && (
            <div className="mt-3 pt-3 border-t border-border-notion/50">
              <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Active Focus Node</span>
            </div>
          )}
        </Link>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full min-h-[700px] py-16 flex flex-col items-center">
      
      {/* Re-center Control - Sticky Persistent Viewport Header */}
      <div className="sticky top-0 right-0 z-40 self-end mr-12 h-0">
        <button 
          onClick={() => scrollToFocus('smooth')}
          className="flex items-center gap-3 px-6 py-3 bg-white/90 backdrop-blur-xl border border-border-notion rounded-2xl shadow-premium hover:border-focus-blue hover:shadow-focus-blue/20 transition-all duration-500 group active:scale-90 translate-y-4"
        >
          <Target size={18} className="text-focus-blue group-hover:rotate-180 transition-transform duration-700" />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-notion">Recalibrate</span>
            <span className="text-[8px] font-bold text-text-dim uppercase tracking-tighter">Snap to focus</span>
          </div>
        </button>
      </div>

      {/* Strategic Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-focus-blue)" stopOpacity="0.1" />
            <stop offset="50%" stopColor="var(--color-focus-blue)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-focus-blue)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {orchard.allEdges.map(edge => {
          const sourceVisible = orchard.keys.includes(orchard.keys.find(k => orchard.levels[k].some(g => g.tasks.some(t => t.id === edge.sourceTaskId))) || '');
          const targetVisible = orchard.keys.includes(orchard.keys.find(k => orchard.levels[k].some(g => g.tasks.some(t => t.id === edge.targetTaskId))) || '');
          
          if (!sourceVisible || !targetVisible) return null;

          const sourceRect = rects[edge.sourceTaskId];
          const targetRect = rects[edge.targetTaskId];
          if (!sourceRect || !targetRect) return null;

          const isHighlight = hoveredNodeId === edge.sourceTaskId || hoveredNodeId === edge.targetTaskId;
          const isDimmed = hoveredNodeId && !isHighlight;
          
          const startX = sourceRect.x + sourceRect.width;
          const startY = sourceRect.y + sourceRect.height / 2;
          const endX = targetRect.x;
          const endY = targetRect.y + targetRect.height / 2;

          return (
            <path 
              key={edge.id}
              d={`M ${startX} ${startY} C ${startX + 80} ${startY}, ${endX - 80} ${endY}, ${endX} ${endY}`} 
              fill="none" 
              stroke={isHighlight ? 'var(--color-focus-blue)' : 'url(#pathGradient)'} 
              strokeWidth={isHighlight ? 3 : 2}
              strokeOpacity={isDimmed ? 0.02 : isHighlight ? 0.8 : 0.4}
              className="transition-all duration-700"
            />
          );
        })}
      </svg>

      {/* The Matrix */}
      <div className="flex justify-center items-start gap-24 min-w-max mx-auto mb-20 px-40">
        {orchard.keys.map(key => (
          <div key={key} className="flex flex-col gap-16 pt-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {orchard.levels[key].map((group, groupIdx) => (
              <div key={groupIdx} className="flex flex-col gap-6">
                <div className="flex items-center gap-3 group/header translate-x-2">
                  <div className="h-4 w-1 rounded-full transition-all duration-500 group-hover/header:h-8 group-hover/header:w-1.5 shadow-sm" style={{ backgroundColor: group.color }} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim/80 select-none">{group.label}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-5">
                  {group.tasks.map(task => renderTaskCard(task, key === 'C'))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Quantum Bloom Discovery Button */}
      {(hasNextPage || isFetchingNextPage) && (
        <div className="sticky bottom-12 z-20">
          <button 
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-4 px-10 py-5 rounded-[2rem] bg-text-notion text-white shadow-premium hover:bg-focus-blue hover:shadow-focus-blue/40 hover:-translate-y-1 transition-all duration-500 group disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <div className="relative">
                <PlusCircle size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                <div className="absolute inset-0 bg-white/20 blur-xl animate-pulse" />
              </div>
            )}
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[13px] font-black uppercase tracking-[0.2em]">Quantum Bloom</span>
              <span className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">Manifest Lineage Chunk</span>
            </div>
          </button>
        </div>
      )}

      {!hasNextPage && !isLoading && (
        <div className="flex flex-col items-center gap-4 py-20 opacity-20">
          <div className="h-px w-40 bg-gradient-to-r from-transparent via-text-dim to-transparent" />
          <div className="text-[11px] font-black uppercase tracking-[0.6em] text-text-dim">Lineage Exhausted</div>
          <div className="h-px w-40 bg-gradient-to-r from-transparent via-text-dim to-transparent" />
        </div>
      )}
    </div>
  );
};
;
