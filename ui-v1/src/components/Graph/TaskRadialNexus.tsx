import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useApi } from '../../context/ApiContext';
import { getLinkLabelColor } from '../../utils/color';
import { PlusCircle, Loader2, Target, Zap, Orbit, MousePointer2 } from 'lucide-react';
import type { ProjectTask } from '../../api/types';

interface TaskRadialNexusProps {
  taskId: string;
}

interface NexusNode {
  task: ProjectTask;
  x: number;
  y: number;
  depth: number;
  direction: 'incoming' | 'outgoing' | 'center';
  angle: number;
}

export const TaskRadialNexus: React.FC<TaskRadialNexusProps> = ({ taskId }) => {
  const { taskApi } = useApi();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  // Canvas State: Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Infinite Discovery Engine
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['neighbourhood-radial', taskId],
    queryFn: ({ pageParam }) => taskApi.getTaskNeighbourhood(taskId, 50, 10, pageParam),
    initialPageParam: '0',
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  // 2. Radial Coordinate Calculation
  const nexus = useMemo(() => {
    if (!data) return null;

    const focusedTask = data.pages[0].focusedTask;
    const allNodes = data.pages.flatMap(p => p.nodes);
    const allEdges = data.pages.flatMap(p => p.edges);

    const nodes: NexusNode[] = [
      { task: focusedTask, x: 0, y: 0, depth: 0, direction: 'center', angle: 0 }
    ];

    // Grouping by direction and depth
    const incomingByDepth: Record<number, ProjectTask[]> = {};
    const outgoingByDepth: Record<number, ProjectTask[]> = {};

    allNodes.forEach(n => {
      const target = n.direction === 'incoming' ? incomingByDepth : outgoingByDepth;
      if (!target[n.depth]) target[n.depth] = [];
      target[n.depth].push(n.task);
    });

    const RING_SPACING = 350;
    const ANGLE_RANGE = Math.PI * 0.6; // 108 degrees for each hemisphere

    // Distribute Ancestors (Left Hemisphere)
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

    // Distribute Successors (Right Hemisphere)
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

  // 3. Pan & Zoom Handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const blockGestures = (e: WheelEvent) => {
      // Explicitly block systemic "swipe-to-back/forward" on Mac
      e.preventDefault();
      
      if (e.ctrlKey) {
        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        setTransform(prev => ({
          ...prev,
          scale: Math.max(0.1, Math.min(2, prev.scale * delta))
        }));
      } else {
        setTransform(prev => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      }
    };

    // Non-passive listener is required to reliably call preventDefault() for gestures
    container.addEventListener('wheel', blockGestures, { passive: false });
    return () => container.removeEventListener('wheel', blockGestures);
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

  const recenter = () => {
    setTransform({ x: 0, y: 0, scale: 0.8 });
  };

  const linkedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (hoveredNodeId && nexus) {
      set.add(hoveredNodeId);
      nexus.allEdges.forEach(e => {
        if (e.sourceTaskId === hoveredNodeId) set.add(e.targetTaskId);
        if (e.targetTaskId === hoveredNodeId) set.add(e.sourceTaskId);
      });
    }
    return set;
  }, [hoveredNodeId, nexus]);

  if (isLoading) return <div className="p-20 text-center text-text-dim/40 font-black uppercase tracking-[0.3em] animate-pulse h-[800px] flex items-center justify-center">Calibrating Nexus...</div>;
  if (isError || !nexus) return <div className="p-20 text-center text-incoming font-bold">Nexus manifestation halted.</div>;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-white/40 rounded-[3rem] border border-border-notion shadow-inner transition-colors duration-500 cursor-grab overscroll-none ${isDragging ? 'cursor-grabbing select-none' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* HUD Controls */}
      <div className="absolute top-8 left-8 z-30 flex flex-col gap-4 pointer-events-none">
        <div className="p-6 bg-white/80 backdrop-blur-2xl rounded-3xl border border-border-notion shadow-premium">
          <div className="flex items-center gap-3 mb-2">
            <Orbit className="text-focus-blue animate-spin-slow" size={20} />
            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-text-notion">Neural Nexus</h3>
          </div>
          <p className="text-[10px] text-text-dim font-medium uppercase tracking-widest leading-relaxed">
            Concentrically mapping {nexus.nodes.length} nodes<br/>
            across hemispheric discovery orbits.
          </p>
        </div>

        <button 
          onClick={recenter}
          className="pointer-events-auto flex items-center gap-3 px-6 py-4 bg-white/90 backdrop-blur-xl border border-border-notion rounded-2xl shadow-premium hover:border-focus-blue hover:shadow-focus-blue/20 transition-all duration-500 group active:scale-95"
        >
          <Target size={18} className="text-focus-blue group-hover:scale-125 transition-transform duration-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-notion">Snap to Core</span>
        </button>
      </div>

      <div className="absolute bottom-8 right-8 z-30 pointer-events-none flex flex-col items-end gap-4">
        {hasNextPage && (
          <button 
            onClick={() => fetchNextPage()}
            className="pointer-events-auto flex items-center gap-4 px-10 py-5 rounded-[2rem] bg-text-notion text-white shadow-premium hover:bg-focus-blue hover:shadow-focus-blue/40 hover:-translate-y-1 transition-all duration-500 group"
          >
            {isFetchingNextPage ? <Loader2 size={24} className="animate-spin" /> : <PlusCircle size={24} className="group-hover:rotate-90 transition-transform duration-500" />}
            <span className="text-[13px] font-black uppercase tracking-[0.2em]">Expand Orbits</span>
          </button>
        )}
        <div className="flex items-center gap-4 px-6 py-3 bg-white/80 backdrop-blur-xl border border-border-notion rounded-full">
          <MousePointer2 size={14} className="text-text-dim" />
          <span className="text-[9px] font-black uppercase tracking-widest text-text-dim">Drag to pan • Scroll to zoom</span>
        </div>
      </div>

      {/* The Nexus Canvas */}
      <div 
        className="absolute inset-0 transition-transform duration-100 ease-out"
        style={{ transform: `translate(calc(50% + ${transform.x}px), calc(50% + ${transform.y}px)) scale(${transform.scale})` }}
      >
        {/* Connection Layer */}
        <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-focus-blue)" stopOpacity="0.2" />
              <stop offset="50%" stopColor="var(--color-focus-blue)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--color-focus-blue)" stopOpacity="0.2" />
            </linearGradient>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--color-focus-blue)" opacity="0.3" />
            </marker>
          </defs>

          {nexus.allEdges.map(edge => {
            const s = nexus.nodes.find(n => n.task.id === edge.sourceTaskId);
            const t = nexus.nodes.find(n => n.task.id === edge.targetTaskId);
            if (!s || !t) return null;

            const isHighlight = hoveredNodeId === s.task.id || hoveredNodeId === t.task.id;
            const isDimmed = hoveredNodeId && !isHighlight;
            
            // Draw smooth arc between points
            const midX = (s.x + t.x) / 2;
            const midY = (s.y + t.y) / 2;
            const cpX = midX - (t.y - s.y) * 0.2; // Add bow to the line
            const cpY = midY + (t.x - s.x) * 0.2;

            const pathD = `M ${s.x} ${s.y} Q ${cpX} ${cpY}, ${t.x} ${t.y}`;
            const color = getLinkLabelColor(edge.label);

            return (
              <React.Fragment key={edge.id}>
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke={isHighlight ? color : 'var(--color-focus-blue)'} 
                  strokeWidth={isHighlight ? 4 : 2} 
                  strokeOpacity={isDimmed ? 0.02 : isHighlight ? 0.8 : 0.15} 
                  className="transition-all duration-700" 
                  markerEnd={isHighlight ? "url(#arrowhead)" : ""}
                />
                
                {isHighlight && (
                  <foreignObject x={(s.x + t.x) / 2 - 40} y={(s.y + t.y) / 2 - 12} width="80" height="24">
                    <div className="flex justify-center flex-col items-center gap-1">
                       <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest text-white shadow-premium" style={{ backgroundColor: color }}>
                        {edge.label}
                      </div>
                    </div>
                  </foreignObject>
                )}
              </React.Fragment>
            );
          })}
        </svg>

        {/* Node Layer */}
        {nexus.nodes.map(node => {
          const isFocus = node.direction === 'center';
          const isActuallyDimmed = hoveredNodeId && !linkedNodeIds.has(node.task.id);
          const color = node.task.status === 'DONE' ? 'var(--color-done)' : node.task.status === 'IN_PROGRESS' ? 'var(--color-incoming)' : 'var(--color-todo)';
          
          return (
            <div
              key={node.task.id}
              data-task-id={node.task.id}
              onMouseEnter={() => setHoveredNodeId(node.task.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              className={`
                absolute transition-all duration-1000 transform -translate-x-1/2 -translate-y-1/2
                ${isActuallyDimmed ? 'opacity-20 grayscale scale-90 blur-[1px]' : 'opacity-100'}
              `}
              style={{ left: node.x, top: node.y }}
            >
              <div 
                className={`
                  p-4 rounded-[2rem] border transition-all duration-500
                  ${isFocus 
                    ? 'w-72 bg-white border-focus-blue shadow-premium ring-[16px] ring-focus-blue/5 scale-110' 
                    : 'w-56 bg-white/90 backdrop-blur-md border-border-notion hover:border-focus-blue hover:shadow-2xl hover:scale-110'
                  }
                `}
              >
                <Link 
                  to="/projects/$projectId/tasks/$taskId" 
                  params={{ projectId: node.task.projectId, taskId: node.task.id }}
                  className="group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: color }}>
                      {node.task.status}
                    </div>
                    <Zap size={12} className={isFocus ? 'text-focus-blue' : 'text-text-dim opacity-30'} />
                  </div>
                  <p className={`leading-tight font-black text-text-notion group-hover:text-focus-blue transition-colors ${isFocus ? 'text-[16px]' : 'text-[13px]'}`}>
                    {node.task.title}
                  </p>
                  {isFocus && (
                    <div className="mt-3 pt-3 border-t border-border-notion/50 flex items-center justify-between">
                      <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Nexus Core</span>
                      <Target size={14} className="text-focus-blue animate-pulse" />
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
