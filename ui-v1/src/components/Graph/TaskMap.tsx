import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useApi } from '../../context/ApiContext';
import { getLinkLabelColor } from '../../utils/color';
import { PlusCircle, Loader2, Target, MousePointer2 } from 'lucide-react';
import type { ProjectTask } from '../../api/types';

interface TaskMapProps {
  projectId: string;
  taskId: string;
}

import type { MapNode } from './layoutWorker';

interface Coordinate {
  x: number;
  y: number;
}
interface RelationshipTooltipProps {
  edgeId: string;
  mapData: {
    nodes: MapNode[];
    allEdges: any[];
  };
}

const RelationshipTooltip: React.FC<RelationshipTooltipProps> = ({ edgeId, mapData }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  const edge = mapData.allEdges.find(e => e.id === edgeId);
  if (!edge) return null;
  const s = mapData.nodes.find(n => n.task.id === edge.sourceTaskId);
  const t = mapData.nodes.find(n => n.task.id === edge.targetTaskId);
  if (!s || !t) return null;

  return (
    <div 
      className="fixed z-[100] pointer-events-none flex flex-col gap-1 px-4 py-3 bg-white border border-border-notion rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200"
      style={{ left: pos.x + 20, top: pos.y - 40 }}
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
};

export const TaskMap: React.FC<TaskMapProps> = ({ projectId, taskId }) => {
  const { taskApi } = useApi();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  
  // Canvas State: Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Layout & Pinning State
  const [isComputing, setIsComputing] = useState(false);
  const [mapData, setMapData] = useState<{ nodes: MapNode[], allEdges: any[] } | null>(null);
  const [coordinateCache, setCoordinateCache] = useState<Record<string, Coordinate>>({});
  const workerRef = useRef<Worker | null>(null);

  // 1. Dependency Engine (Depth-Favored Proximity)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    isError
  } = useInfiniteQuery({
    queryKey: ['neighbourhood-map', taskId],
    queryFn: ({ pageParam }) => taskApi.getTaskNeighbourhood(projectId, taskId, 5, 5, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  // 2. Web Worker Layout Bridge
  useEffect(() => {
    if (!data || !data.pages[0]?.focusedTask) return;

    if (!workerRef.current) {
        workerRef.current = new Worker(new URL('./layoutWorker.ts', import.meta.url), { type: 'module' });
        
        workerRef.current.onmessage = (e) => {
            const { nodes, allEdges } = e.data;
            
            // Apply Pinning Logic: Merge new positions with existing cache
            setCoordinateCache(prev => {
                const nextCache = { ...prev };
                const finalNodes = nodes.map((node: MapNode) => {
                    if (nextCache[node.task.id]) {
                        // Use pinned coordinates
                        return { ...node, ...nextCache[node.task.id] };
                    } else {
                        // "Bake" the new coordinate into cache
                        nextCache[node.task.id] = { x: node.x, y: node.y };
                        return node;
                    }
                });

                setMapData({ nodes: finalNodes, allEdges });
                setIsComputing(false);
                return nextCache;
            });
        };
    }

    setIsComputing(true);
    workerRef.current.postMessage({
        pages: data.pages,
        taskId,
        horizontalSpacing: 300,
        verticalSpacing: 200
    });

    return () => {
        // We don't terminate immediately to allow reuse, but we could if needed.
    };
  }, [data, taskId]);

  const resetPins = () => {
    setCoordinateCache({});
    // Trigger re-computation
    if (workerRef.current && data) {
        setIsComputing(true);
        workerRef.current.postMessage({
            pages: data.pages,
            taskId,
            horizontalSpacing: 300,
            verticalSpacing: 200
        });
    }
  };

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
  if (isError || !mapData) {
    return (
      <div className="p-20 h-full flex flex-col items-center justify-center bg-bg-secondary gap-4">
        <div className="text-center text-red-500 font-bold text-sm tracking-tight uppercase opacity-80">
          Discovery Engine Issue
        </div>
        <div className="max-w-xs text-center text-text-dim text-[13px] leading-relaxed">
          {(error as Error)?.message || 'We couldn\'t load the dependency map for this task. It might be disconnected or missing.'}
        </div>
        <button 
          onClick={recenter}
          className="mt-2 text-xs font-bold text-focus-blue hover:underline"
        >
          Reset View
        </button>
      </div>
    );
  }

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
        <button 
          onClick={resetPins}
          className="pointer-events-auto p-2 bg-white border border-border-notion rounded-lg shadow-sm hover:border-text-dim transition-all active:scale-95 text-text-notion flex items-center gap-2"
          title="Reset Layout Pins"
        >
          <Loader2 size={16} className={`${isComputing ? 'animate-spin' : ''} text-text-dim`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim">Reset Pins</span>
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
        className="absolute inset-0"
        style={{ transform: `translate(calc(50% + ${transform.x}px), calc(50% + ${transform.y}px)) scale(${transform.scale})` }}
      >
        <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
          {mapData.allEdges.map(edge => {
            const s = mapData.nodes.find(n => n.task.id === edge.sourceTaskId);
            const t = mapData.nodes.find(n => n.task.id === edge.targetTaskId);
            if (!s || !t) return null;

            const isHighlight = hoveredNodeId === s.task.id || hoveredNodeId === t.task.id || hoveredEdgeId === edge.id;
            const isDimmed = (hoveredNodeId || hoveredEdgeId) && !isHighlight;
            
            // Vertical bezier: source bottom → target top
            // Nodes are stacked by rank (Y-axis)
            const nodeHalfHeight = s.task.id === taskId ? 60 : 50; 
            const targetHalfHeight = t.task.id === taskId ? 60 : 50;
            
            const sx = s.x;
            const sy = s.y + nodeHalfHeight;
            const tx = t.x;
            const ty = t.y - targetHalfHeight;
            
            const cpOffset = Math.abs(ty - sy) * 0.5;
            const pathD = `M ${sx} ${sy} C ${sx} ${sy + cpOffset}, ${tx} ${ty - cpOffset}, ${tx} ${ty}`;
            const color = getLinkLabelColor(edge.label);

            const defaultStroke = '#c8c7c4';

            return (
              <React.Fragment key={edge.id}>
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
                  stroke={isHighlight ? color : defaultStroke} 
                  strokeWidth={isHighlight ? 2.5 : 1.5} 
                  strokeOpacity={isDimmed ? 0.1 : isHighlight ? 1 : 0.7} 
                  className="transition-all duration-300 pointer-events-none" 
                />
                
                {isHighlight && (
                  <foreignObject x={(sx + tx) / 2 - 40} y={(sy + ty) / 2 - 10} width="80" height="20">
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
                    {node.task.team && (
                      <span className="text-[9px] font-bold text-text-dim uppercase tracking-wider truncate max-w-[100px]">
                        {node.task.team.name}
                      </span>
                    )}
                  </div>
                  <p className={`leading-snug font-bold text-text-notion group-hover:text-focus-blue transition-colors px-1 mb-2 ${isFocus ? 'text-[15px]' : 'text-[13px]'}`}>
                    {node.task.title}
                  </p>
                  {node.task.assignee && (
                    <div className="flex items-center gap-1.5 px-1 pb-1 opacity-60">
                      <div className="w-4 h-4 rounded-full bg-bg-secondary flex items-center justify-center text-[10px] text-text-dim border border-border-notion">
                        {node.task.assignee.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[10px] font-medium text-text-dim truncate">
                        {node.task.assignee.username}
                      </span>
                    </div>
                  )}
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
        <RelationshipTooltip edgeId={hoveredEdgeId} mapData={mapData} />
      )}
    </div>
  );
};
