import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useApi } from '../../context/ApiContext';
import { getLinkLabelColor } from '../../utils/color';
import { PlusCircle, Loader2, Target, MousePointer2 } from 'lucide-react';
import type { ProjectTask } from '../../api/types';

interface TaskMapProps {
  taskId: string;
}

interface MapNode {
  task: ProjectTask;
  x: number;
  y: number;
  rank: number; // Vertical position level
}

export const TaskMap: React.FC<TaskMapProps> = ({ taskId }) => {
  const { taskApi } = useApi();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Canvas State: Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Dependency Engine (Depth-Favored Proximity)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['neighbourhood-map', taskId],
    queryFn: ({ pageParam }) => taskApi.getTaskNeighbourhood(taskId, 5, 5, pageParam),
    initialPageParam: undefined, // Start from the beginning
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  // 2. Intelligent Graph Ranking (Depth-Synchronized)
  const mapData = useMemo(() => {
    if (!data) return null;

    const focusedTask = data.pages[0].focusedTask;
    const allTasks = new Map<string, ProjectTask>();
    const allEdges = data.pages.flatMap(p => p.edges);
    const nodeDepths = new Map<string, { depth: number, direction: string }>();
    
    // Accumulate unique tasks and their depths from all pages
    data.pages.forEach(p => {
      p.nodes.forEach(n => {
        allTasks.set(n.task.id, n.task);
        // Track the minimum depth found for this task in the neighbourhood
        const existing = nodeDepths.get(n.task.id);
        if (!existing || n.depth < existing.depth) {
          nodeDepths.set(n.task.id, { depth: n.depth, direction: n.direction });
        }
      });
    });
    // Ensure focused task is present
    allTasks.set(focusedTask.id, focusedTask);

    const nodesList = Array.from(allTasks.values());

    // ─── Phase 1: Rank by Backend Depth ───
    const ranks = new Map<string, number>();
    ranks.set(taskId, 0);

    nodesList.forEach(task => {
      const dInfo = nodeDepths.get(task.id);
      if (dInfo) {
        // Incoming tasks are ranked negatively (above), outgoing positively (below)
        const rankValue = dInfo.direction === 'incoming' ? -dInfo.depth : dInfo.depth;
        ranks.set(task.id, rankValue);
      }
    });

    // ─── Phase 2: Refine Disconnected Tasks ───
    // If some nodes are linked but we don't have depth info (shouldn't happen), propagate
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

    const VERTICAL_SPACING = 200;
    const HORIZONTAL_SPACING = 300;

    // Group by rank for horizontal distribution
    const byRank: Record<number, ProjectTask[]> = {};
    nodesList.forEach(task => {
      const r = ranks.get(task.id) ?? 0;
      if (!byRank[r]) byRank[r] = [];
      byRank[r].push(task);
    });

    // Sort each rank by createdAt DESC (newest center-most or consistent layout)
    Object.keys(byRank).forEach(r => {
      byRank[Number(r)].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    const positionedNodes: MapNode[] = nodesList.map(task => {
      const r = ranks.get(task.id) ?? 0;
      const row = byRank[r];
      const index = row.indexOf(task);
      const x = (index - (row.length - 1) / 2) * HORIZONTAL_SPACING;
      const y = r * VERTICAL_SPACING;
      return { task, x, y, rank: r };
    });

    return { nodes: positionedNodes, allEdges, focusedTask };
  }, [data, taskId]);

  // 3. Navigation Listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        setTransform(prev => ({ ...prev, scale: Math.max(0.1, Math.min(2, prev.scale * delta)) }));
      } else {
        setTransform(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    }));
  };

  const handleMouseUp = () => setIsDragging(false);
  const recenter = () => setTransform({ x: 0, y: 0, scale: 0.8 });

  const linkedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (hoveredNodeId && mapData) {
      set.add(hoveredNodeId);
      mapData.allEdges.forEach(e => {
        if (e.sourceTaskId === hoveredNodeId) set.add(e.targetTaskId);
        if (e.targetTaskId === hoveredNodeId) set.add(e.sourceTaskId);
      });
    }
    return set;
  }, [hoveredNodeId, mapData]);

  if (isLoading) return <div className="p-20 text-center text-text-dim text-[13px] font-medium h-full flex items-center justify-center bg-bg-secondary">Loading Reachability...</div>;
  if (isError || !mapData) return <div className="p-20 text-center text-red-500 font-medium h-full flex items-center justify-center bg-bg-secondary underline">Discovery Engine Issue.</div>;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-bg-secondary cursor-grab overscroll-none touch-none ${isDragging ? 'cursor-grabbing select-none' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-8 left-8 z-30 flex items-center gap-4 pointer-events-none">
        <button 
          onClick={recenter}
          className="pointer-events-auto p-2 bg-white border border-border-notion rounded-lg shadow-sm hover:border-text-dim transition-all active:scale-95 text-text-notion"
          title="Center Context"
        >
          <Target size={18} className="text-focus-blue" />
        </button>
      </div>

      <div className="absolute bottom-8 right-8 z-30 pointer-events-none flex flex-col items-end gap-3">
        {hasNextPage && (
          <button 
            onClick={() => fetchNextPage()}
            className="pointer-events-auto p-3 rounded-full bg-text-notion text-white shadow-lg hover:bg-focus-blue transition-all active:scale-95"
            title="Load Next Layer"
          >
            {isFetchingNextPage ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
          </button>
        )}
        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-border-notion rounded-md shadow-sm">
          <MousePointer2 size={12} className="text-text-dim" />
          <span className="text-[10px] font-medium text-text-dim uppercase tracking-wider">Pan • Scroll to zoom</span>
        </div>
      </div>

      <div 
        className="absolute inset-0 transition-transform duration-100 ease-out"
        style={{ transform: `translate(calc(50% + ${transform.x}px), calc(50% + ${transform.y}px)) scale(${transform.scale})` }}
      >
        <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
          {mapData.allEdges.map(edge => {
            const s = mapData.nodes.find(n => n.task.id === edge.sourceTaskId);
            const t = mapData.nodes.find(n => n.task.id === edge.targetTaskId);
            if (!s || !t) return null;

            const isHighlight = hoveredNodeId === s.task.id || hoveredNodeId === t.task.id || hoveredEdgeId === edge.id;
            const isDimmed = (hoveredNodeId || hoveredEdgeId) && !isHighlight;
            
            const cp1y = s.y + (t.y - s.y) * 0.5;
            const cp2y = s.y + (t.y - s.y) * 0.5;
            const pathD = `M ${s.x} ${s.y} C ${s.x} ${cp1y}, ${t.x} ${cp2y}, ${t.x} ${t.y}`;
            const color = getLinkLabelColor(edge.label);

            return (
              <React.Fragment key={edge.id}>
                {/* Interaction Hit-Area (Invisible but wider for easy hovering) */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={20}
                  className="pointer-events-auto cursor-help"
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                />

                <path 
                  d={pathD} 
                  fill="none" 
                  stroke={isHighlight ? color : 'var(--color-border-notion)'} 
                  strokeWidth={isHighlight ? 2 : 1} 
                  strokeOpacity={isDimmed ? 0.1 : 1} 
                  className="transition-all duration-300 pointer-events-none" 
                />
                
                {isHighlight && (
                  <foreignObject x={(s.x + t.x) / 2 - 40} y={(s.y + t.y) / 2 - 10} width="80" height="20">
                    <div className="flex justify-center pointer-events-none">
                       <div className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: color }}>
                        {edge.label}
                      </div>
                    </div>
                  </foreignObject>
                )}
              </React.Fragment>
            );
          })}
        </svg>

        {mapData.nodes.map(node => {
          const isFocus = node.task.id === taskId;
          const isActuallyDimmed = hoveredNodeId && !linkedNodeIds.has(node.task.id);
          const color = node.task.status === 'DONE' ? 'var(--color-done)' : node.task.status === 'IN_PROGRESS' ? 'var(--color-incoming)' : 'var(--color-todo)';
          
          return (
            <div
              key={node.task.id}
              onMouseEnter={() => setHoveredNodeId(node.task.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              className={`
                absolute transition-all duration-500 transform -translate-x-1/2 -translate-y-1/2
                ${isActuallyDimmed ? 'opacity-30' : 'opacity-100'}
              `}
              style={{ left: node.x, top: node.y }}
            >
              <div 
                className={`
                  p-4 rounded-xl border transition-all duration-300 bg-white
                  ${isFocus 
                    ? 'w-64 border-focus-blue shadow-lg ring-4 ring-focus-blue/5' 
                    : 'w-52 border-border-notion hover:border-text-dim hover:shadow-md'
                  }
                `}
              >
                <Link 
                  to="/projects/$projectId/tasks/$taskId" 
                  params={{ projectId: node.task.projectId, taskId: node.task.id }}
                  className="group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: color }}>
                      {node.task.status}
                    </div>
                  </div>
                  <p className={`leading-snug font-bold text-text-notion group-hover:text-focus-blue transition-colors px-1 ${isFocus ? 'text-[15px]' : 'text-[13px]'}`}>
                    {node.task.title}
                  </p>
                  {isFocus && (
                    <div className="mt-3 pt-3 border-t border-border-notion flex items-center justify-between opacity-30">
                      <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Center</span>
                    </div>
                  )}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Relationship Tooltip */}
      {hoveredEdgeId && mapData && (
        (() => {
          const edge = mapData.allEdges.find(e => e.id === hoveredEdgeId);
          if (!edge) return null;
          const s = mapData.nodes.find(n => n.task.id === edge.sourceTaskId);
          const t = mapData.nodes.find(n => n.task.id === edge.targetTaskId);
          if (!s || !t) return null;

          return (
            <div 
              className="fixed z-[100] pointer-events-none flex flex-col gap-1 px-4 py-3 bg-white border border-border-notion rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200"
              style={{ left: mousePos.x + 20, top: mousePos.y - 40 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-text-notion truncate max-w-[120px]">{s.task.title}</span>
                <div className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: getLinkLabelColor(edge.label) }}>
                  {edge.label}
                </div>
                <span className="text-[11px] font-bold text-text-notion truncate max-w-[120px]">{t.task.title}</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-40">
                <div className="w-1.5 h-1.5 rounded-full bg-text-dim" />
                <span className="text-[9px] font-medium text-text-dim uppercase tracking-tighter">Connecting Thread</span>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
};
