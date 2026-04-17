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
  depth: number;
  direction: 'incoming' | 'outgoing' | 'center';
  angle: number;
}

export const TaskMap: React.FC<TaskMapProps> = ({ taskId }) => {
  const { taskApi } = useApi();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  // Canvas State: Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Discovery Engine
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['neighbourhood-map', taskId],
    queryFn: ({ pageParam }) => taskApi.getTaskNeighbourhood(taskId, 50, 10, pageParam),
    initialPageParam: '0',
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  // 2. Coordinate Calculation
  const mapData = useMemo(() => {
    if (!data) return null;

    const focusedTask = data.pages[0].focusedTask;
    const allNodes = data.pages.flatMap(p => p.nodes);
    const allEdges = data.pages.flatMap(p => p.edges);

    const nodes: MapNode[] = [
      { task: focusedTask, x: 0, y: 0, depth: 0, direction: 'center', angle: 0 }
    ];

    const incomingByDepth: Record<number, ProjectTask[]> = {};
    const outgoingByDepth: Record<number, ProjectTask[]> = {};

    allNodes.forEach(n => {
      const target = n.direction === 'incoming' ? incomingByDepth : outgoingByDepth;
      if (!target[n.depth]) target[n.depth] = [];
      target[n.depth].push(n.task);
    });

    const RING_SPACING = 320;
    const ANGLE_RANGE = Math.PI * 0.7; // Slightly wider distribution

    Object.entries(incomingByDepth).forEach(([depthStr, tasks]) => {
      const d = parseInt(depthStr);
      const r = d * RING_SPACING;
      tasks.forEach((task, i) => {
        const step = tasks.length > 1 ? ANGLE_RANGE / (tasks.length - 1) : 0;
        const startAngle = Math.PI - (ANGLE_RANGE / 2);
        const angle = startAngle + (i * step);
        nodes.push({
          task,
          depth: d,
          direction: 'incoming',
          angle,
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r
        });
      });
    });

    Object.entries(outgoingByDepth).forEach(([depthStr, tasks]) => {
      const d = parseInt(depthStr);
      const r = d * RING_SPACING;
      tasks.forEach((task, i) => {
        const step = tasks.length > 1 ? ANGLE_RANGE / (tasks.length - 1) : 0;
        const startAngle = -(ANGLE_RANGE / 2);
        const angle = startAngle + (i * step);
        nodes.push({
          task,
          depth: d,
          direction: 'outgoing',
          angle,
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r
        });
      });
    });

    return { nodes, allEdges, focusedTask };
  }, [data]);

  // 3. Interaction Handlers
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

  if (isLoading) return <div className="p-20 text-center text-text-dim text-[13px] font-medium tracking-tight h-full flex items-center justify-center bg-bg-secondary">Loading relationships...</div>;
  if (isError || !mapData) return <div className="p-20 text-center text-red-500 font-medium h-full flex items-center justify-center bg-bg-secondary underline">Failed to load task map.</div>;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-bg-secondary transition-colors duration-500 cursor-grab ${isDragging ? 'cursor-grabbing select-none' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Minimal HUD Controls */}
      <div className="absolute top-8 left-8 z-30 flex items-center gap-4 pointer-events-none">
        <button 
          onClick={recenter}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 bg-white border border-border-notion rounded-lg shadow-sm hover:border-focus-blue transition-all active:scale-95"
        >
          <Target size={14} className="text-focus-blue" />
          <span className="text-[12px] font-bold text-text-notion">Center Current Task</span>
        </button>
      </div>

      <div className="absolute bottom-8 right-8 z-30 pointer-events-none flex flex-col items-end gap-3">
        {hasNextPage && (
          <button 
            onClick={() => fetchNextPage()}
            className="pointer-events-auto flex items-center gap-2 px-6 py-3 rounded-lg bg-text-notion text-white shadow-sm hover:bg-focus-blue transition-all active:scale-95"
          >
            {isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
            <span className="text-[12px] font-bold">Load More Tasks</span>
          </button>
        )}
        <div className="flex items-center gap-3 px-4 py-2 bg-white/80 border border-border-notion rounded-md backdrop-blur-sm">
          <MousePointer2 size={12} className="text-text-dim" />
          <span className="text-[10px] font-medium text-text-dim">Pan • Scroll to zoom</span>
        </div>
      </div>

      {/* The Map Canvas */}
      <div 
        className="absolute inset-0 transition-transform duration-100 ease-out"
        style={{ transform: `translate(calc(50% + ${transform.x}px), calc(50% + ${transform.y}px)) scale(${transform.scale})` }}
      >
        <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="var(--color-border-notion)" />
            </marker>
          </defs>

          {mapData.allEdges.map(edge => {
            const s = mapData.nodes.find(n => n.task.id === edge.sourceTaskId);
            const t = mapData.nodes.find(n => n.task.id === edge.targetTaskId);
            if (!s || !t) return null;

            const isHighlight = hoveredNodeId === s.task.id || hoveredNodeId === t.task.id;
            const isDimmed = hoveredNodeId && !isHighlight;
            
            const midX = (s.x + t.x) / 2;
            const midY = (s.y + t.y) / 2;
            const cpX = midX - (t.y - s.y) * 0.15;
            const cpY = midY + (t.x - s.x) * 0.15;

            const pathD = `M ${s.x} ${s.y} Q ${cpX} ${cpY}, ${t.x} ${t.y}`;
            const color = getLinkLabelColor(edge.label);

            return (
              <React.Fragment key={edge.id}>
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke={isHighlight ? color : 'var(--color-border-notion)'} 
                  strokeWidth={isHighlight ? 2 : 1} 
                  strokeOpacity={isDimmed ? 0.1 : 1} 
                  className="transition-all duration-300" 
                  markerEnd={isHighlight ? "url(#arrowhead)" : ""}
                />
                
                {isHighlight && (
                  <foreignObject x={(s.x + t.x) / 2 - 40} y={(s.y + t.y) / 2 - 10} width="80" height="20">
                    <div className="flex justify-center">
                       <div className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider text-white border border-white/20" style={{ backgroundColor: color }}>
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
          const isFocus = node.direction === 'center';
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
                    <div className="mt-3 pt-3 border-t border-border-notion flex items-center justify-between opacity-50">
                      <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Current Task</span>
                    </div>
                  )}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
