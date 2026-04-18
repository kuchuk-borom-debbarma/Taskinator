import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useApi } from '../../context/ApiContext';
import { getLinkLabelColor } from '../../utils/color';
import {
  PlusCircle,
  Loader2,
  Target,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Keyboard,
  MousePointer,
  Maximize,
  Sparkles,
  Zap,
  ExternalLink,
  ArrowRightLeft,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCookie, setCookie } from '../../utils/cookies';

interface TaskMapProps {
  projectId: string;
  taskId: string;
}

import type { MapNode } from './layoutWorker';

interface Coordinate {
  x: number;
  y: number;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

interface PanVelocity {
  x: number;
  y: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const EDGE_PAN_THRESHOLD = 80;
const EDGE_PAN_MAX_SPEED = 14;

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
  // ─── STATE & REFS ───
  const { taskApi } = useApi();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Persistence Initializers
  const [inputMode, setInputMode] = useState<'mouse' | 'trackpad'>(() => {
    const saved = getCookie('task-map-input-mode');
    return (saved === 'mouse' || saved === 'trackpad') ? saved : 'mouse';
  });
  const [keyboardEnabled, setKeyboardEnabled] = useState(() => {
    const saved = getCookie('task-map-keyboard-enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Canvas State: Pan & Zoom
  const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 0.8 });
  const transformRef = useRef(transform);
  useEffect(() => { transformRef.current = transform; }, [transform]);

  // Mirror Refs for stable event listeners
  const inputModeRef = useRef(inputMode);
  const keyboardEnabledRef = useRef(keyboardEnabled);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputModeRef.current = inputMode;
    setCookie('task-map-input-mode', inputMode);
  }, [inputMode]);

  useEffect(() => {
    keyboardEnabledRef.current = keyboardEnabled;
    setCookie('task-map-keyboard-enabled', String(keyboardEnabled));
  }, [keyboardEnabled]);

  // Dragging State
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const isDragLocked = draggedNodeId !== null;
  const isDragLockedRef = useRef(isDragLocked);
  useEffect(() => { isDragLockedRef.current = isDragLocked; }, [isDragLocked]);

  const dragStart = useRef({ x: 0, y: 0 });
  const nodeStartPos = useRef({ x: 0, y: 0 });
  const dragPointerRef = useRef({ x: 0, y: 0 });
  const edgePanVelocityRef = useRef<PanVelocity>({ x: 0, y: 0 });
  const edgePanFrameRef = useRef<number | null>(null);

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
    if (isDragLocked) return;
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

  const zoomAtPoint = (clientX: number, clientY: number, scaleFactor: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const pointerX = clientX - rect.left - rect.width / 2;
    const pointerY = clientY - rect.top - rect.height / 2;

    setTransform(prev => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * scaleFactor));
      if (nextScale === prev.scale) return prev;

      const worldX = (pointerX - prev.x) / prev.scale;
      const worldY = (pointerY - prev.y) / prev.scale;

      return {
        x: pointerX - worldX * nextScale,
        y: pointerY - worldY * nextScale,
        scale: nextScale,
      };
    });
  };

  const zoomAtViewportCenter = (scaleFactor: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, scaleFactor);
  };

  const syncNodePosition = (nodeId: string, x: number, y: number) => {
    setCoordinateCache(prev => ({
      ...prev,
      [nodeId]: { x, y }
    }));

    setMapData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map(n => n.task.id === nodeId ? { ...n, x, y } : n)
      };
    });
  };

  const getDraggedNodePosition = (scale: number) => ({
    x: nodeStartPos.current.x + (dragPointerRef.current.x - dragStart.current.x) / scale,
    y: nodeStartPos.current.y + (dragPointerRef.current.y - dragStart.current.y) / scale,
  });

  const stopEdgeAutoPan = () => {
    edgePanVelocityRef.current = { x: 0, y: 0 };
    if (edgePanFrameRef.current !== null) {
      cancelAnimationFrame(edgePanFrameRef.current);
      edgePanFrameRef.current = null;
    }
  };

  const computeEdgePanSpeed = (distanceToEdge: number, direction: -1 | 1) => {
    if (distanceToEdge >= EDGE_PAN_THRESHOLD) return 0;
    const ratio = (EDGE_PAN_THRESHOLD - Math.max(distanceToEdge, 0)) / EDGE_PAN_THRESHOLD;
    return direction * Math.max(2, ratio * EDGE_PAN_MAX_SPEED);
  };

  const getEdgePanVelocity = (clientX: number, clientY: number, rect: DOMRect): PanVelocity => {
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    return {
      x:
        localX < EDGE_PAN_THRESHOLD
          ? computeEdgePanSpeed(localX, 1)
          : rect.width - localX < EDGE_PAN_THRESHOLD
            ? computeEdgePanSpeed(rect.width - localX, -1)
            : 0,
      y:
        localY < EDGE_PAN_THRESHOLD
          ? computeEdgePanSpeed(localY, 1)
          : rect.height - localY < EDGE_PAN_THRESHOLD
            ? computeEdgePanSpeed(rect.height - localY, -1)
            : 0,
    };
  };

  const updateEdgeAutoPan = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container || !draggedNodeId) {
      stopEdgeAutoPan();
      return;
    }

    const rect = container.getBoundingClientRect();
    const velocity = getEdgePanVelocity(clientX, clientY, rect);
    edgePanVelocityRef.current = velocity;

    if (velocity.x === 0 && velocity.y === 0) {
      if (edgePanFrameRef.current !== null) {
        cancelAnimationFrame(edgePanFrameRef.current);
        edgePanFrameRef.current = null;
      }
      return;
    }

    if (edgePanFrameRef.current !== null) return;

    const tick = () => {
      const { x: vx, y: vy } = edgePanVelocityRef.current;
      if (!draggedNodeId || (vx === 0 && vy === 0)) {
        edgePanFrameRef.current = null;
        return;
      }

      setTransform(prev => ({ ...prev, x: prev.x + vx, y: prev.y + vy }));
      dragStart.current = {
        x: dragStart.current.x + vx,
        y: dragStart.current.y + vy,
      };

      const nodeId = draggedNodeId;
      const scale = transformRef.current.scale;
      const { x, y } = getDraggedNodePosition(scale);
      syncNodePosition(nodeId, x, y);

      edgePanFrameRef.current = requestAnimationFrame(tick);
    };

    edgePanFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => stopEdgeAutoPan(), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (isDragLockedRef.current) return;
      e.preventDefault();

      const currentMode = inputModeRef.current;
      const isZoomGesture = e.ctrlKey || currentMode === 'mouse';
      
      if (isZoomGesture) {
        zoomAtPoint(e.clientX, e.clientY, e.deltaY > 0 ? 0.9 : 1.1);
      } else if (currentMode === 'trackpad') {
        setTransform(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!keyboardEnabledRef.current || isDragLockedRef.current) return;

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
        case '+': case '=': zoomAtViewportCenter(1.2); break;
        case '-': case '_': zoomAtViewportCenter(0.8); break;
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
  }, [containerRef.current]); // Re-attach only if container Ref actually changes (should be stable)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDragLocked) return;
    if (e.button !== 0) return;
    setIsDraggingCanvas(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    
    // Clear selection if clicking canvas
    if (selectedEdgeId && e.target === containerRef.current) {
        setSelectedEdgeId(null);
    }
  };

  const handleNodeMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHoveredNodeId(null);
    setHoveredEdgeId(null);
    setIsDraggingCanvas(false);
    setDraggedNodeId(id);
    const pos = coordinateCache[id] || { x: 0, y: 0 };
    dragStart.current = { x: e.clientX, y: e.clientY };
    nodeStartPos.current = { ...pos };
    dragPointerRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      dragPointerRef.current = { x: e.clientX, y: e.clientY };
      const { x, y } = getDraggedNodePosition(transform.scale);
      syncNodePosition(draggedNodeId, x, y);
      updateEdgeAutoPan(e.clientX, e.clientY);
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
      stopEdgeAutoPan();
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
      <div className={`absolute top-8 left-8 z-50 flex flex-col gap-4 pointer-events-none transition-opacity ${isDragLocked ? 'opacity-40' : ''}`}>
        <div className="flex items-center gap-1.5 bg-white border border-border-notion p-1.5 rounded-xl shadow-premium pointer-events-auto">
          <fieldset disabled={isDragLocked} className="contents">
            <ControlButton onClick={recenter} title="Center View"><Target size={18} className="text-focus-blue" /></ControlButton>
            <ControlButton onClick={zoomReset} title="Reset Zoom (100%)"><Maximize size={18} className="text-focus-blue" /></ControlButton>
          </fieldset>
          <div className="flex items-center justify-center px-2.5 min-w-[48px] bg-bg-secondary rounded-lg h-9 border border-border-notion/50 pointer-events-none select-none">
            <span className="text-[10px] font-bold text-focus-blue tracking-tighter">{Math.round(transform.scale * 100)}%</span>
          </div>
          <fieldset disabled={isDragLocked} className="contents">
            <ControlButton onClick={autoLayout} title="Auto-Layout"><Sparkles size={16} className={`${isComputing ? 'animate-spin' : ''} text-text-dim`} /></ControlButton>
          </fieldset>
        </div>

        <div className="flex flex-col gap-2 p-1.5 bg-white/80 backdrop-blur-md border border-border-notion rounded-xl shadow-premium pointer-events-auto">
          <fieldset disabled={isDragLocked} className="contents">
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
          </fieldset>
        </div>
      </div>

      {/* ── Directional Controls ── */}
      <div className={`absolute bottom-8 left-8 z-50 flex flex-col items-center gap-1 pointer-events-auto transition-opacity ${isDragLocked ? 'opacity-40' : ''}`}>
        <button disabled={isDragLocked} onClick={() => setTransform(p => ({ ...p, y: p.y + 100 / p.scale }))} className="p-2 bg-white border border-border-notion rounded-t-lg hover:bg-bg-secondary text-text-dim disabled:opacity-50"><ChevronUp size={16} /></button>
        <div className="flex gap-1">
          <button disabled={isDragLocked} onClick={() => setTransform(p => ({ ...p, x: p.x + 100 / p.scale }))} className="p-2 bg-white border border-border-notion hover:bg-bg-secondary text-text-dim disabled:opacity-50"><ChevronLeft size={16} /></button>
          <button disabled={isDragLocked} onClick={recenter} className="p-2 bg-white border border-border-notion hover:bg-bg-secondary text-focus-blue disabled:opacity-50"><Circle size={10} fill="currentColor" /></button>
          <button disabled={isDragLocked} onClick={() => setTransform(p => ({ ...p, x: p.x - 100 / p.scale }))} className="p-2 bg-white border border-border-notion hover:bg-bg-secondary text-text-dim disabled:opacity-50"><ChevronRight size={16} /></button>
        </div>
        <button disabled={isDragLocked} onClick={() => setTransform(p => ({ ...p, y: p.y - 100 / p.scale }))} className="p-2 bg-white border border-border-notion rounded-b-lg hover:bg-bg-secondary text-text-dim disabled:opacity-50"><ChevronDown size={16} /></button>

        <div className="mt-4 flex flex-col gap-1 w-full">
          <button disabled={isDragLocked} onClick={() => zoomAtViewportCenter(1.2)} className="p-2 bg-white border border-border-notion rounded-lg hover:bg-bg-secondary text-text-dim font-bold disabled:opacity-50">+</button>
          <button disabled={isDragLocked} onClick={() => zoomAtViewportCenter(0.8)} className="p-2 bg-white border border-border-notion rounded-lg hover:bg-bg-secondary text-text-dim font-bold disabled:opacity-50">-</button>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 z-30 pointer-events-none flex flex-col items-end gap-3">
        {hasNextPage && (
          <button
            disabled={isDragLocked}
            onClick={() => fetchNextPage()}
            className="pointer-events-auto p-3 rounded-full bg-text-notion text-white shadow-lg hover:bg-focus-blue transition-all active:scale-95 disabled:opacity-50 disabled:hover:bg-text-notion"
            title="Load Next Layer"
          >
            {isFetchingNextPage ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
          </button>
        )}
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
                  className={isDragLocked ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'}
                  onMouseEnter={() => { if (!isDragLocked) setHoveredEdgeId(edge.id); }}
                  onMouseLeave={() => { if (!isDragLocked) setHoveredEdgeId(null); }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(edge.id);
                  }}
                />

                <path
                  d={pathD}
                  fill="none"
                  stroke={isHighlight || selectedEdgeId === edge.id ? color : defaultStroke}
                  strokeWidth={isHighlight || selectedEdgeId === edge.id ? 2.5 : 1.5}
                  strokeOpacity={isDimmed && selectedEdgeId !== edge.id ? 0.1 : 1}
                  className="transition-all duration-300 pointer-events-none"
                />

                {(isHighlight || selectedEdgeId === edge.id) && (
                  <foreignObject x={(sx + tx) / 2 - 40} y={(sy + ty) / 2 - 10} width="80" height="20">
                    <div className="flex justify-center pointer-events-none">
                      <div className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-white shadow-sm" style={{ backgroundColor: color }}>
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
              onMouseEnter={() => { if (!isDragLocked) setHoveredNodeId(node.task.id); }}
              onMouseLeave={() => { if (!isDragLocked) setHoveredNodeId(null); }}
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
                  className={`group ${isDragLocked ? 'pointer-events-none' : ''}`}
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
      {!isDragLocked && hoveredEdgeId && !selectedEdgeId && mapData && (
        <RelationshipTooltip edgeId={hoveredEdgeId} mapData={mapData} />
      )}

      {/* Interactive Edge Link Portal */}
      <AnimatePresence>
        {selectedEdgeId && mapData && (
          <EdgeLinkPortal 
            edgeId={selectedEdgeId} 
             mapData={mapData} 
             onClose={() => setSelectedEdgeId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const EdgeLinkPortal: React.FC<{ edgeId: string, mapData: { nodes: MapNode[], allEdges: any[] }, onClose: () => void }> = ({ edgeId, mapData, onClose }) => {
  const edge = mapData.allEdges.find(e => e.id === edgeId);
  if (!edge) return null;
  const s = mapData.nodes.find(n => n.task.id === edge.sourceTaskId);
  const t = mapData.nodes.find(n => n.task.id === edge.targetTaskId);
  if (!s || !t) return null;

  const color = getLinkLabelColor(edge.label);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center bg-white/90 backdrop-blur-xl border border-border-notion rounded-3xl shadow-premium overflow-hidden min-w-[500px]"
    >
      <div className="flex-1 flex flex-col p-6 hover:bg-bg-secondary transition-colors group">
        <Link 
          to="/projects/$projectId/tasks/$taskId" 
          params={{ projectId: s.task.projectId, taskId: s.task.id }}
          className="flex flex-col gap-1"
        >
          <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest opacity-60">Source Task</span>
          <span className="text-[15px] font-bold text-text-notion group-hover:text-focus-blue transition-colors line-clamp-1">{s.task.title}</span>
          <div className="flex items-center gap-2 mt-2">
            <div className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: s.task.status === 'DONE' ? 'var(--color-done)' : 'var(--color-todo)' }}>
              {s.task.status}
            </div>
          </div>
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center px-4 py-8 bg-bg-secondary/50 border-x border-border-notion relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-white border border-border-notion rounded-full shadow-sm">
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-notion" style={{ color }}>{edge.label}</span>
        </div>
        <ArrowRightLeft size={20} style={{ color }} className="opacity-40" />
      </div>

      <div className="flex-1 flex flex-col p-6 hover:bg-bg-secondary transition-colors group text-right items-end">
        <Link 
          to="/projects/$projectId/tasks/$taskId" 
           params={{ projectId: t.task.projectId, taskId: t.task.id }}
           className="flex flex-col gap-1 items-end"
        >
          <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest opacity-60">Target Task</span>
          <span className="text-[15px] font-bold text-text-notion group-hover:text-focus-blue transition-colors line-clamp-1">{t.task.title}</span>
          <div className="flex items-center gap-2 mt-2">
            <div className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: t.task.status === 'DONE' ? 'var(--color-done)' : 'var(--color-todo)' }}>
              {t.task.status}
            </div>
          </div>
        </Link>
      </div>

      <button 
        onClick={onClose}
        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-bg-secondary text-text-dim opacity-30 hover:opacity-100 transition-all"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};
