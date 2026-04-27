import React, { useMemo, useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Loader2,
  Target,
  Keyboard,
  MousePointer,
  Maximize,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import type { GraphEdge, GraphNode, ProjectTask, TaskNeighbourhood } from '../../api/types';

const getLinkLabelColor = (label: string = '') => {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 45%)`;
};

export interface MapNode {
  task: ProjectTask;
  x: number;
  y: number;
  rank: number;
}

interface TaskMapProps {
  projectId: string;
  taskId: string;
  neighbourhood: TaskNeighbourhood;
  handleNext?: () => void;
  handlePrev?: () => void;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  isFetching?: boolean;
}

const ControlButton: React.FC<{ onClick: () => void; active?: boolean; title: string; children: React.ReactNode }> = ({
  onClick,
  active,
  title,
  children,
}) => (
  <button
    onClick={onClick}
    className={`pointer-events-auto flex items-center justify-center rounded-2xl border p-3 shadow-lg transition-all active:scale-95 ${
      active
        ? 'border-app-accent bg-app-accent text-white'
        : 'border-app-line bg-white/88 text-app-muted hover:border-app-ink/20 hover:text-app-ink'
    }`}
    title={title}
  >
    {children}
  </button>
);

const RelationshipTooltip: React.FC<{ edgeId: string; mapData: { nodes: MapNode[]; allEdges: any[] } }> = ({ edgeId, mapData }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => setPos({ x: event.clientX, y: event.clientY });
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  const edge = mapData.allEdges.find((entry) => entry.id === edgeId);
  if (!edge) return null;

  const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
  const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
  const source = mapData.nodes.find((node) => node.task.id === sourceId);
  const target = mapData.nodes.find((node) => node.task.id === targetId);
  if (!source || !target) return null;

  return (
    <div
      className="fixed z-[100] pointer-events-none flex flex-col gap-1 rounded-2xl border border-app-line bg-white/96 px-4 py-3 shadow-xl"
      style={{ left: pos.x + 20, top: pos.y - 40 }}
    >
      <div className="flex items-center gap-2">
        <span className="max-w-[120px] truncate text-[11px] font-bold text-app-ink">{source.task.title}</span>
        <div
          className="rounded px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: getLinkLabelColor(edge.label) }}
        >
          {edge.label}
        </div>
        <span className="max-w-[120px] truncate text-[11px] font-bold text-app-ink">{target.task.title}</span>
      </div>
    </div>
  );
};

export const TaskMap: React.FC<TaskMapProps> = ({
  projectId,
  taskId,
  neighbourhood,
  handleNext,
  handlePrev,
  hasNextPage,
  hasPreviousPage,
  isFetching,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [inputMode, setInputMode] = useState<'mouse' | 'trackpad'>('mouse');
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const [mapData, setMapData] = useState<{ nodes: MapNode[]; allEdges: any[] }>({ nodes: [], allEdges: [] });

  const syncLayoutData = useMemo(() => computeMapData(neighbourhood, taskId), [neighbourhood, taskId]);

  useEffect(() => {
    let cancelled = false;

    try {
      const worker = new Worker(new URL('./layoutWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event) => {
        if (!cancelled) setMapData(event.data);
      };
      worker.onerror = () => {
        if (!cancelled) setMapData(syncLayoutData);
      };
      worker.postMessage({
        pages: [neighbourhood],
        taskId,
        horizontalSpacing: 350,
        verticalSpacing: 220,
      });

      return () => {
        cancelled = true;
        worker.terminate();
      };
    } catch {
      setMapData(syncLayoutData);
      return () => {
        cancelled = true;
      };
    }
  }, [neighbourhood, taskId, syncLayoutData]);

  useEffect(() => {
    if (mapData.nodes.length === 0) return;
    setTransform({ x: 0, y: 0, scale: 0.8 });
  }, [mapData.nodes]);

  useEffect(() => {
    if (!keyboardEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const step = 40 / transform.scale;
      if (event.key === 'ArrowUp') setTransform((value) => ({ ...value, y: value.y + step }));
      if (event.key === 'ArrowDown') setTransform((value) => ({ ...value, y: value.y - step }));
      if (event.key === 'ArrowLeft') setTransform((value) => ({ ...value, x: value.x + step }));
      if (event.key === 'ArrowRight') setTransform((value) => ({ ...value, x: value.x - step }));
      if (event.key === '+' || event.key === '=') setTransform((value) => ({ ...value, scale: value.scale * 1.1 }));
      if (event.key === '-' || event.key === '_') setTransform((value) => ({ ...value, scale: value.scale * 0.9 }));
      if (event.key === '0') setTransform({ x: 0, y: 0, scale: 0.8 });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardEnabled, transform.scale]);

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (inputMode === 'trackpad') {
      if (event.ctrlKey) {
        setTransform((value) => ({
          ...value,
          scale: Math.max(0.1, value.scale * (1 - event.deltaY * 0.01)),
        }));
      } else {
        setTransform((value) => ({
          ...value,
          x: value.x - event.deltaX,
          y: value.y - event.deltaY,
        }));
      }
    } else {
      setTransform((value) => ({
        ...value,
        scale: Math.max(0.1, value.scale * (1 - event.deltaY * 0.001)),
      }));
    }
  };

  const linkedNodeIds = useMemo(() => {
    const value = new Set<string>();
    if (hoveredNodeId) {
      value.add(hoveredNodeId);
      mapData.allEdges.forEach((edge: any) => {
        const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        if (sourceId === hoveredNodeId) value.add(targetId);
        if (targetId === hoveredNodeId) value.add(sourceId);
      });
    }
    return value;
  }, [hoveredNodeId, mapData.allEdges]);

  return (
    <div
      className="relative h-full w-full cursor-crosshair overflow-hidden overscroll-none select-none"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(255, 132, 84, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(15, 139, 141, 0.12), transparent 20%), linear-gradient(180deg, #f9f2e9 0%, #f2eadd 100%)',
      }}
      onWheel={handleWheel}
    >
      <div className="pointer-events-none absolute right-6 top-6 z-50 flex flex-wrap gap-2">
        <ControlButton onClick={() => setInputMode('mouse')} active={inputMode === 'mouse'} title="Mouse Mode: Scroll to zoom, Drag to pan">
          <MousePointer size={18} />
        </ControlButton>
        <ControlButton onClick={() => setInputMode('trackpad')} active={inputMode === 'trackpad'} title="Trackpad Mode: Two-finger pan, Pinch to zoom">
          <Maximize size={18} />
        </ControlButton>
        <ControlButton onClick={() => setKeyboardEnabled(!keyboardEnabled)} active={keyboardEnabled} title="Keyboard Navigation: Arrow keys to pan">
          <Keyboard size={18} />
        </ControlButton>
        <div className="mx-1 h-6 w-px bg-app-line" />
        <ControlButton onClick={() => setTransform({ x: 0, y: 0, scale: 0.8 })} title="Re-center View">
          <Target size={18} />
        </ControlButton>
      </div>

      <div
        className="absolute inset-0 transition-transform duration-75"
        style={{ transform: `translate(calc(50% + ${transform.x}px), calc(50% + ${transform.y}px)) scale(${transform.scale})` }}
      >
        <svg className="absolute inset-0 h-full w-full pointer-events-none overflow-visible">
          {mapData.allEdges.map((edge: any) => {
            const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
            const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
            const source = mapData.nodes.find((node) => node.task.id === sourceId);
            const target = mapData.nodes.find((node) => node.task.id === targetId);
            if (!source || !target) return null;

            const isHighlight =
              hoveredNodeId === source.task.id || hoveredNodeId === target.task.id || hoveredEdgeId === edge.id;
            const isDimmed = (hoveredNodeId || hoveredEdgeId) && !isHighlight;
            const color = getLinkLabelColor(edge.label);

            const sx = source.x;
            const sy = source.y + (source.task.id === taskId ? 60 : 50);
            const tx = target.x;
            const ty = target.y - (target.task.id === taskId ? 60 : 50);

            const cpOffset = Math.abs(ty - sy) * 0.5;
            const pathD = `M ${sx} ${sy} C ${sx} ${sy + cpOffset}, ${tx} ${ty - cpOffset}, ${tx} ${ty}`;

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
                  stroke={color}
                  strokeWidth={isHighlight ? 3 : 1.5}
                  strokeOpacity={isDimmed ? 0.12 : isHighlight ? 0.95 : 0.38}
                  className="transition-all duration-300"
                />
              </React.Fragment>
            );
          })}
        </svg>

        {mapData.nodes.map((node) => {
          const isFocus = node.task.id === taskId;
          const isActuallyDimmed = hoveredNodeId && !linkedNodeIds.has(node.task.id);
          const color =
            node.task.status === 'DONE' ? '#10b981' : node.task.status === 'IN_PROGRESS' ? '#3b82f6' : '#64748b';

          return (
            <div
              key={node.task.id}
              onMouseEnter={() => setHoveredNodeId(node.task.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transform transition-all ${isActuallyDimmed ? 'grayscale opacity-20' : 'opacity-100'}`}
              style={{ left: node.x, top: node.y }}
            >
              <div
                className={`rounded-[28px] border bg-white/92 p-5 shadow-[0_24px_60px_rgba(24,33,47,0.10)] backdrop-blur-xl transition-all duration-500 ${
                  isFocus ? 'w-72 border-app-accent ring-8 ring-app-accent/10' : 'w-60 border-app-line hover:border-app-ink/20'
                }`}
              >
                <Link to="/projects/$projectId/tasks/$taskId" params={{ projectId, taskId: node.task.id }}>
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      {node.task.status}
                    </div>
                  </div>
                  <p className={`font-black leading-tight text-app-ink ${isFocus ? 'text-[16px]' : 'text-[14px]'}`}>
                    {node.task.title}
                  </p>
                  {!isFocus && node.task.team?.name ? (
                    <p className="mt-2 text-[11px] font-medium text-app-muted">
                      {node.task.team.name}
                    </p>
                  ) : null}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {hoveredEdgeId ? <RelationshipTooltip edgeId={hoveredEdgeId} mapData={mapData} /> : null}

      <div className="absolute bottom-8 right-8 z-50 flex gap-4">
        {hasPreviousPage && handlePrev ? (
          <button
            onClick={handlePrev}
            disabled={isFetching}
            className="group rounded-full bg-white border border-app-line p-4 text-app-ink shadow-[0_14px_36px_rgba(24,33,47,0.1)] transition-all hover:scale-110 active:scale-95 disabled:scale-100 disabled:opacity-50"
            title="Previous Page"
          >
            {isFetching ? <Loader2 size={24} className="animate-spin" /> : <ArrowLeft size={24} />}
          </button>
        ) : null}
        {hasNextPage && handleNext ? (
          <button
            onClick={handleNext}
            disabled={isFetching}
            className="group rounded-full bg-app-accent p-4 text-white shadow-[0_14px_36px_rgba(255,106,61,0.35)] transition-all hover:scale-110 active:scale-95 disabled:scale-100 disabled:opacity-50"
            title="Next Page"
          >
            {isFetching ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
          </button>
        ) : null}
      </div>
    </div>
  );
};

function computeMapData(neighbourhood: TaskNeighbourhood, taskId: string) {
  const allTasks = new Map<string, ProjectTask>();
  const edgeMap = new Map<string, any>();
  const nodeDepths = new Map<string, { depth: number; direction: string }>();

  allTasks.set(neighbourhood.focusedTask.id, neighbourhood.focusedTask);
  nodeDepths.set(neighbourhood.focusedTask.id, { depth: 0, direction: 'outgoing' });

  neighbourhood.nodes.forEach((node: GraphNode) => {
    allTasks.set(node.task.id, node.task);
    const existing = nodeDepths.get(node.task.id);
    if (!existing || (node.depth ?? 1) < existing.depth) {
      nodeDepths.set(node.task.id, { depth: node.depth ?? 1, direction: node.direction });
    }
  });

  neighbourhood.edges.forEach((edge: GraphEdge) => {
    edgeMap.set(edge.id, {
      ...edge,
      source: edge.sourceTaskId,
      target: edge.targetTaskId,
    });
  });

  const nodesList = Array.from(allTasks.values());
  const allEdges = Array.from(edgeMap.values());
  const ranks = new Map<string, number>();
  ranks.set(taskId, 0);

  nodesList.forEach((task) => {
    const depthInfo = nodeDepths.get(task.id);
    if (depthInfo) {
      const rankValue = depthInfo.direction === 'incoming' ? -depthInfo.depth : depthInfo.depth;
      ranks.set(task.id, rankValue);
    }
  });

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 20) {
    changed = false;
    iterations += 1;
    allEdges.forEach((edge) => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;

      const sourceRank = ranks.get(sourceId);
      const targetRank = ranks.get(targetId);
      if (sourceRank !== undefined && targetRank === undefined) {
        ranks.set(targetId, sourceRank + 1);
        changed = true;
      } else if (targetRank !== undefined && sourceRank === undefined) {
        ranks.set(sourceId, targetRank - 1);
        changed = true;
      }
    });
  }

  const byRank: Record<number, ProjectTask[]> = {};
  nodesList.forEach((task) => {
    const rank = ranks.get(task.id) ?? 0;
    if (!byRank[rank]) byRank[rank] = [];
    byRank[rank].push(task);
  });

  Object.keys(byRank).forEach((rank) => {
    byRank[Number(rank)].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  const nodes: MapNode[] = nodesList.map((task) => {
    const rank = ranks.get(task.id) ?? 0;
    const row = byRank[rank];
    const index = row.indexOf(task);
    const x = (index - (row.length - 1) / 2) * 350;
    const y = rank * 220;
    return { task, x, y, rank };
  });

  return { nodes, allEdges };
}
