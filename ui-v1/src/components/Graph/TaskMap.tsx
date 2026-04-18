import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useApi } from '../../context/ApiContext';
import { getLinkLabelColor } from '../../utils/color';
import {
  PlusCircle,
  Loader2,
  Target,
  MousePointer2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Keyboard,
  MousePointer,
  Maximize,
  Sparkles,
  Zap
} from 'lucide-react';

interface TaskMapProps {
  projectId: string;
  taskId: string;
}

import type { MapNode } from './layoutWorker';

interface Coordinate {
  x: number;
  y: number;
}
const ControlButton: React.FC<{ onClick: () => void, title: string, children: React.ReactNode }> = ({ onClick, title, children }) => (
  <button
    onClick={onClick}
    className="pointer-events-auto p-3 bg-white border border-border-notion rounded-xl shadow-premium hover:border-focus-blue hover:text-focus-blue transition-all active:scale-95 flex items-center justify-center text-text-notion"
    title={title}
  >
    {children}
  </button>
);

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
  const [inputMode, setInputMode] = useState<'mouse' | 'trackpad'>('mouse');
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);

  // Dragging State
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const nodeStartPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Layout & Pinning State
  const [isComputing, setIsComputing] = useState(false);
  const [mapData, setMapData] = useState<{ nodes: MapNode[], allEdges: any[] } | null>(null);
  const [coordinateCache, setCoordinateCache] = useState<Record<string, Coordinate>>({});
  const workerRef = useRef<Worker | null>(null);

  // 1. Dependency Engine
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery({
    queryKey: ['neighbourhood-map', taskId],
    queryFn: ({ pageParam }) => taskApi.getTaskNeighbourhood(projectId, taskId, 5, 5, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  // 2. Web Worker Bridge
  useEffect(() => {
    if (!data || !data.pages[0]?.focusedTask) return;

    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./layoutWorker.ts', import.meta.url), { type: 'module' });

      workerRef.current.onmessage = (e) => {
        const { nodes, allEdges } = e.data;

        setCoordinateCache(prev => {
          const nextCache = { ...prev };
          const finalNodes = nodes.map((node: MapNode) => {
            if (nextCache[node.task.id]) {
              return { ...node, ...nextCache[node.task.id] };
            } else {
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
      verticalSpacing: 350
    });
  }, [data, taskId]);

  const autoLayout = () => {
    setCoordinateCache({});
    if (workerRef.current && data) {
      setIsComputing(true);
      workerRef.current.postMessage({
        pages: data.pages,
        taskId,
        horizontalSpacing: 300,
        verticalSpacing: 350
      });
    }
  };

  // 3. Handlers
  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const { x, y, scale: prevScale } = transformRef.current;

      if (e.ctrlKey) {
        // ZOOM TO CURSOR
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = prevScale * delta;

        // Get mouse pos relative to screen center (roughly origin of our transform)
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left - rect.width / 2;
        const my = e.clientY - rect.top - rect.height / 2;

        // Offset so mouse point stays fixed
        const newX = mx - (mx - x) * (newScale / prevScale);
        const newY = my - (my - y) * (newScale / prevScale);

        setTransform({ x: newX, y: newY, scale: newScale });
      } else if (inputMode === 'trackpad') {
        setTransform(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!keyboardEnabled) return;

      const key = e.key.toLowerCase();
      // Prevent scrolling page
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
      }

      const { scale } = transformRef.current;
      const step = 100 / scale; // Faster step

      switch (key) {
        case 'arrowleft': case 'a': setTransform(p => ({ ...p, x: p.x + step })); break;
        case 'arrowright': case 'd': setTransform(p => ({ ...p, x: p.x - step })); break;
        case 'arrowup': case 'w': setTransform(p => ({ ...p, y: p.y + step })); break;
        case 'arrowdown': case 's': setTransform(p => ({ ...p, y: p.y - step })); break;
        case '+': case '=': setTransform(p => ({ ...p, scale: p.scale * 1.2 })); break;
        case '-': case '_': setTransform(p => ({ ...p, scale: p.scale * 0.8 })); break;
        case '0': setTransform(p => ({ ...p, scale: 1 })); break;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus container to catch keys on open
    container.focus();

    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputMode, keyboardEnabled]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDraggingCanvas(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleNodeMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedNodeId(id);
    const pos = coordinateCache[id] || { x: 0, y: 0 };
    dragStart.current = { x: e.clientX, y: e.clientY };
    nodeStartPos.current = { ...pos };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      const dx = (e.clientX - dragStart.current.x) / transform.scale;
      const dy = (e.clientY - dragStart.current.y) / transform.scale;
      const newX = nodeStartPos.current.x + dx;
      const newY = nodeStartPos.current.y + dy;

      setCoordinateCache(prev => ({
        ...prev,
        [draggedNodeId]: { x: newX, y: newY }
      }));

      // Update mapData for immediate render
      setMapData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map(n => n.task.id === draggedNodeId ? { ...n, x: newX, y: newY } : n)
        };
      });
    } else if (isDraggingCanvas && inputMode === 'mouse') {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      }));
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeId) {
      resolveCollisions(draggedNodeId);
      setDraggedNodeId(null);
    }
    setIsDraggingCanvas(false);
  };

  const resolveCollisions = (id: string) => {
    if (!mapData) return;
    const target = mapData.nodes.find(n => n.task.id === id);
    if (!target) return;

    const TW = id === taskId ? 256 : 208;
    const TH = id === taskId ? 160 : 140;

    setCoordinateCache(prev => {
      let nx = prev[id].x;
      let ny = prev[id].y;
      let collision = true;
      let iterations = 0;

      while (collision && iterations < 10) {
        collision = false;
        for (const other of mapData.nodes) {
          if (other.task.id === id) continue;

          const ox = prev[other.task.id]?.x ?? other.x;
          const oy = prev[other.task.id]?.y ?? other.y;
          const OW = other.task.id === taskId ? 256 : 208;
          const OH = other.task.id === taskId ? 160 : 140;

          // AABB check
          const dx = Math.abs(nx - ox);
          const dy = Math.abs(ny - oy);
          const minX = (TW + OW) / 2 + 40; // 40px padding
          const minY = (TH + OH) / 2 + 40;

          if (dx < minX && dy < minY) {
            collision = true;
            // Push away on smaller axis
            if (minX - dx < minY - dy) {
              nx += (nx > ox ? 1 : -1) * (minX - dx);
            } else {
              ny += (ny > oy ? 1 : -1) * (minY - dy);
            }
          }
        }
        iterations++;
      }

      if (iterations > 0) {
        // Sync mapData
        setMapData(m => m ? ({ ...m, nodes: m.nodes.map(n => n.task.id === id ? { ...n, x: nx, y: ny } : n) }) : m);
      }

      return { ...prev, [id]: { x: nx, y: ny } };
    });
  };

  const recenter = () => {
    if (!mapData) return;
    const focusNode = mapData.nodes.find(n => n.task.id === taskId);
    if (!focusNode) {
      setTransform(prev => ({ ...prev, x: 0, y: 0 }));
      return;
    }
    // Center logic: transform x/y should counter the node's x/y * scaled
    setTransform(prev => ({
      ...prev,
      x: -focusNode.x * prev.scale,
      y: -focusNode.y * prev.scale
    }));
  };
  const zoomReset = () => setTransform(prev => ({ ...prev, scale: 1 }));

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
      tabIndex={0}
      className={`relative w-full h-full overflow-hidden bg-bg-secondary overscroll-none touch-none focus:outline-none ${inputMode === 'mouse' ? (isDraggingCanvas ? 'cursor-grabbing select-none' : 'cursor-grab') : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ── Control Center ── */}
      <div className="absolute top-8 left-8 z-50 flex flex-col gap-4 pointer-events-none">
        <div className="flex items-center gap-1.5 bg-white border border-border-notion p-1.5 rounded-xl shadow-premium pointer-events-auto">
          <ControlButton onClick={recenter} title="Center View"><Target size={18} className="text-focus-blue" /></ControlButton>
          <ControlButton onClick={zoomReset} title="Reset Zoom (100%)"><Maximize size={18} className="text-focus-blue" /></ControlButton>
          <div className="flex items-center justify-center px-2.5 min-w-[48px] bg-bg-secondary rounded-lg h-9 border border-border-notion/50 pointer-events-none select-none">
            <span className="text-[10px] font-bold text-focus-blue tracking-tighter">{Math.round(transform.scale * 100)}%</span>
          </div>
          <ControlButton onClick={autoLayout} title="Auto-Layout"><Sparkles size={16} className={`${isComputing ? 'animate-spin' : ''} text-text-dim`} /></ControlButton>
        </div>

        <div className="flex flex-col gap-2 p-1.5 bg-white/80 backdrop-blur-md border border-border-notion rounded-xl shadow-premium pointer-events-auto">
          <div className="grid grid-cols-2 gap-1 bg-bg-secondary p-1 rounded-lg">
            <button
              onClick={() => setInputMode('mouse')}
              className={`p-2 rounded-md transition-all ${inputMode === 'mouse' ? 'bg-white text-focus-blue shadow-sm' : 'text-text-dim opacity-50 hover:opacity-100'}`}
              title="Mouse Mode"
            >
              <MousePointer size={14} />
            </button>
            <button
              onClick={() => setInputMode('trackpad')}
              className={`p-2 rounded-md transition-all ${inputMode === 'trackpad' ? 'bg-white text-focus-blue shadow-sm' : 'text-text-dim opacity-50 hover:opacity-100'}`}
              title="Trackpad Mode"
            >
              <Zap size={14} />
            </button>
          </div>
          <button
            onClick={() => setKeyboardEnabled(!keyboardEnabled)}
            className={`flex items-center justify-center p-2 rounded-lg border transition-all ${keyboardEnabled ? 'bg-focus-blue/5 border-focus-blue/20 text-focus-blue' : 'bg-transparent border-transparent text-text-dim opacity-40'}`}
            title="Toggle Keyboard"
          >
            <Keyboard size={14} />
          </button>
        </div>
      </div>

      {/* ── Directional Controls ── */}
      <div className="absolute bottom-8 left-8 z-50 flex flex-col items-center gap-1 pointer-events-auto">
        <button onClick={() => setTransform(p => ({ ...p, y: p.y + 100 / p.scale }))} className="p-2 bg-white border border-border-notion rounded-t-lg hover:bg-bg-secondary text-text-dim"><ChevronUp size={16} /></button>
        <div className="flex gap-1">
          <button onClick={() => setTransform(p => ({ ...p, x: p.x + 100 / p.scale }))} className="p-2 bg-white border border-border-notion hover:bg-bg-secondary text-text-dim"><ChevronLeft size={16} /></button>
          <button onClick={recenter} className="p-2 bg-white border border-border-notion hover:bg-bg-secondary text-focus-blue"><Circle size={10} fill="currentColor" /></button>
          <button onClick={() => setTransform(p => ({ ...p, x: p.x - 100 / p.scale }))} className="p-2 bg-white border border-border-notion hover:bg-bg-secondary text-text-dim"><ChevronRight size={16} /></button>
        </div>
        <button onClick={() => setTransform(p => ({ ...p, y: p.y - 100 / p.scale }))} className="p-2 bg-white border border-border-notion rounded-b-lg hover:bg-bg-secondary text-text-dim"><ChevronDown size={16} /></button>

        <div className="mt-4 flex flex-col gap-1 w-full">
          <button onClick={() => setTransform(p => ({ ...p, scale: p.scale * 1.2 }))} className="p-2 bg-white border border-border-notion rounded-lg hover:bg-bg-secondary text-text-dim font-bold">+</button>
          <button onClick={() => setTransform(p => ({ ...p, scale: p.scale * 0.8 }))} className="p-2 bg-white border border-border-notion rounded-lg hover:bg-bg-secondary text-text-dim font-bold">-</button>
        </div>
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
              onMouseDown={(e) => handleNodeMouseDown(node.task.id, e)}
              onMouseEnter={() => setHoveredNodeId(node.task.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              className={`
                absolute transition-all transform -translate-x-1/2 -translate-y-1/2
                ${draggedNodeId === node.task.id ? 'z-50 duration-75 scale-105' : 'duration-500'}
                ${isActuallyDimmed ? 'opacity-30' : 'opacity-100'}
              `}
              style={{ left: node.x, top: node.y }}
            >
              <div
                className={`
                  p-4 rounded-xl border transition-all duration-300 bg-white
                  ${isFocus
                    ? 'w-64 border-focus-blue border-2 shadow-xl ring-8 ring-focus-blue/15'
                    : 'w-52 border-border-notion hover:border-text-dim hover:shadow-md'
                  }
                  ${draggedNodeId === node.task.id ? 'cursor-grabbing border-focus-blue shadow-2xl scale-[1.02]' : 'cursor-grab'}
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
