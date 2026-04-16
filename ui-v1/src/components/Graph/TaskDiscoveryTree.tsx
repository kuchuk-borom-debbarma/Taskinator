import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useApi } from '../../context/ApiContext';
import { getLinkLabelColor } from '../../utils/color';
import { PlusCircle, Loader2, Target } from 'lucide-react';
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
    levels['C'].push({ label: 'Focus Node', tasks: [focusedTask], color: '#3b82f6' });

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

  const scrollToFocus = () => {
    if (focusNodeRef.current) {
      focusNodeRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        inline: 'center',
        block: 'nearest'
      });
    }
  };

  // Auto-centering logic: Trigger on initial load, task change, OR lineage expansion
  useEffect(() => {
    if (orchard && !isLoading) {
      const timer = setTimeout(scrollToFocus, 100);
      return () => clearTimeout(timer);
    }
  }, [taskId, isLoading, orchard?.nodeCount]);

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

  if (isLoading) return <div className="p-20 text-center text-text-dim">Initialising Orchard...</div>;
  if (isError || !orchard) return <div className="p-20 text-center text-incoming">Failed to manifest lineage.</div>;

  const renderTaskCard = (task: ProjectTask, isFocus = false) => {
    const isActuallyDimmed = hoveredNodeId && !linkedNodeIds.has(task.id);
    
    return (
      <div 
        key={task.id}
        ref={isFocus ? focusNodeRef : null}
        data-task-id={task.id}
        onMouseEnter={() => setHoveredNodeId(task.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
        className={`
          flex flex-col gap-1.5 p-3 rounded-xl border bg-white shadow-sm transition-all duration-300
          ${isFocus ? 'w-64 border-focus-blue ring-8 ring-focus-blue/5' : 'w-52 border-border-notion hover:border-text-dim hover:shadow-md'}
          ${isActuallyDimmed ? 'opacity-[0.15]' : 'opacity-100'}
        `}
      >
        <Link 
          to="/projects/$projectId/tasks/$taskId" 
          params={{ projectId: task.projectId, taskId: task.id }}
          className="group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-2 h-2 rounded-full ${task.status === 'DONE' ? 'bg-done' : task.status === 'IN_PROGRESS' ? 'bg-incoming' : 'bg-todo'}`} />
            <span className="text-[10px] font-black text-text-dim uppercase tracking-wider">{task.status}</span>
          </div>
          <p className={`leading-snug font-bold text-text-notion group-hover:text-focus-blue transition-colors ${isFocus ? 'text-[14px]' : 'text-[11px]'}`}>
            {task.title}
          </p>
        </Link>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full min-h-[700px] py-16 px-24 flex flex-col items-center">
      
      {/* Re-center Control - Sticky Viewport Header */}
      <div className="sticky top-0 right-0 z-30 self-end mr-10 h-0">
        <button 
          onClick={scrollToFocus}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-border-notion rounded-full shadow-lg hover:border-focus-blue transition-all group active:scale-95 translate-y-6"
        >
          <Target size={14} className="text-text-dim group-hover:text-focus-blue transition-colors" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim group-hover:text-focus-blue">Re-center Focus</span>
        </button>
      </div>

      {/* Strategic Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {orchard.allEdges.map(edge => {
          const sourceVisible = orchard.keys.includes(orchard.keys.find(k => orchard.levels[k].some(g => g.tasks.some(t => t.id === edge.sourceTaskId))) || '');
          const targetVisible = orchard.keys.includes(orchard.keys.find(k => orchard.levels[k].some(g => g.tasks.some(t => t.id === edge.targetTaskId))) || '');
          
          if (!sourceVisible || !targetVisible) return null;

          const sourceRect = rects[edge.sourceTaskId];
          const targetRect = rects[edge.targetTaskId];
          if (!sourceRect || !targetRect) return null;

          const isDimmed = hoveredNodeId && edge.sourceTaskId !== hoveredNodeId && edge.targetTaskId !== hoveredNodeId;
          const color = getLinkLabelColor(edge.label);

          const startX = sourceRect.x + sourceRect.width;
          const startY = sourceRect.y + sourceRect.height / 2;
          const endX = targetRect.x;
          const endY = targetRect.y + targetRect.height / 2;

          return (
            <path 
              key={edge.id}
              d={`M ${startX} ${startY} C ${startX + 50} ${startY}, ${endX - 50} ${endY}, ${endX} ${endY}`} 
              fill="none" 
              stroke={color} 
              strokeWidth={isDimmed ? 1 : 2.5}
              strokeOpacity={isDimmed ? 0.03 : 0.3}
              className="transition-all duration-300"
            />
          );
        })}
      </svg>

      {/* The Matrix */}
      <div className="flex justify-center items-start gap-20 min-w-max mx-auto mb-20">
        {orchard.keys.map(key => (
          <div key={key} className="flex flex-col gap-12 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {orchard.levels[key].map((group, groupIdx) => (
              <div key={groupIdx} className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5 group/header">
                  <div className="h-5 w-1.5 rounded-full transition-transform group-hover/header:scale-y-125" style={{ backgroundColor: group.color }} />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-text-dim/70">{group.label}</span>
                  <div className="text-[10px] font-bold px-2 py-0.5 bg-bg-secondary border border-border-notion/50 rounded-full text-text-dim">{group.tasks.length}</div>
                </div>
                <div className="flex flex-col gap-3">
                  {group.tasks.map(task => renderTaskCard(task, key === 'C'))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Quantum Bloom Discovery Button */}
      {(hasNextPage || isFetchingNextPage) && (
        <div className="sticky bottom-10 z-10">
          <button 
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-3 px-8 py-4 rounded-3xl border border-border-notion bg-white shadow-2xl hover:border-focus-blue hover:shadow-focus-blue/20 transition-all duration-500 group disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <Loader2 size={20} className="text-focus-blue animate-spin" />
            ) : (
              <PlusCircle size={20} className="text-text-dim group-hover:text-focus-blue animate-pulse transition-colors" />
            )}
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[12px] font-black uppercase tracking-widest text-text-notion group-hover:text-focus-blue transition-colors">Quantum Bloom</span>
              <span className="text-[9px] font-bold text-text-dim uppercase tracking-tighter">Reveal Next Lineage Chunk</span>
            </div>
          </button>
        </div>
      )}

      {!hasNextPage && !isLoading && (
        <div className="text-center py-10 opacity-30">
          <div className="text-[11px] font-black uppercase tracking-[0.5em] text-text-dim mb-2">Discovery Finalised</div>
          <div className="text-[9px] font-bold text-text-dim italic">The entire task lineage has been unearthed</div>
        </div>
      )}

      <div className="absolute bottom-6 right-10 pointer-events-none opacity-40">
        <div className="text-[11px] font-black uppercase tracking-[0.3em] text-text-dim">Neural Orchard • Progressive Orchestration</div>
      </div>
    </div>
  );
};
;
