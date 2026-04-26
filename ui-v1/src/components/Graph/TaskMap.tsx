import React, { useMemo, useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import {
  PlusCircle,
  Loader2,
  Target,
  Keyboard,
  MousePointer,
  Maximize,
} from 'lucide-react';
import type { ProjectTask, TaskNeighbourhood } from '../../api/types';

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

const WORLD_SIZE = 4000;
const WORLD_CENTER = WORLD_SIZE / 2;
const NODE_WIDTH = 288;
const NODE_HEIGHT = 140;
const VIEWPORT_PADDING = 180;

interface TaskMapProps {
  projectId: string;
  taskId: string;
  neighbourhood: TaskNeighbourhood;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
}

const ControlButton: React.FC<{ onClick: () => void, active?: boolean, title: string, children: React.ReactNode }> = ({ onClick, active, title, children }) => (
  <button
    onClick={onClick}
    className={`pointer-events-auto flex items-center justify-center rounded-2xl border p-3 shadow-lg transition-all active:scale-95
      ${active ? 'border-app-accent bg-app-accent text-white' : 'border-app-line bg-white/88 text-app-muted hover:border-app-ink/20 hover:text-app-ink'}
    `}
    title={title}
  >
    {children}
  </button>
);

const RelationshipTooltip: React.FC<{ edgeId: string, mapData: { nodes: MapNode[], allEdges: any[] } }> = ({ edgeId, mapData }) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  const edge = mapData.allEdges.find(e => e.id === edgeId);
  if (!edge) return null;
  const sId = typeof edge.source === 'string' ? edge.source : edge.source.id;
  const tId = typeof edge.target === 'string' ? edge.target : edge.target.id;
  const s = mapData.nodes.find(n => n.task.id === sId);
  const t = mapData.nodes.find(n => n.task.id === tId);
  if (!s || !t) return null;

  return (
    <div
      className="fixed z-[100] pointer-events-none flex flex-col gap-1 rounded-2xl border border-app-line bg-white/96 px-4 py-3 shadow-xl"
      style={{ left: pos.x + 20, top: pos.y - 40 }}
    >
      <div className="flex items-center gap-2">
        <span className="max-w-[120px] truncate text-[11px] font-bold text-app-ink">{s.task.title}</span>
        <div className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: getLinkLabelColor(edge.label) }}>
          {edge.label}
        </div>
        <span className="max-w-[120px] truncate text-[11px] font-bold text-app-ink">{t.task.title}</span>
      </div>
    </div>
  );
};

export const TaskMap: React.FC<TaskMapProps> = ({ projectId, taskId, neighbourhood, fetchNextPage, isFetchingNextPage }) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.8 });
  const [inputMode, setInputMode] = useState<'mouse' | 'trackpad'>('mouse');
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const mapData = useMemo(() => {
    const allTasks = new Map<string, ProjectTask>();
    const allEdges = neighbourhood.edges.map((edge) => ({
      ...edge,
      source: edge.sourceTaskId,
      target: edge.targetTaskId,
    }));
    const nodeDepths = new Map<string, { depth: number; direction: string }>();

    allTasks.set(neighbourhood.focusedTask.id, neighbourhood.focusedTask);
    nodeDepths.set(neighbourhood.focusedTask.id, { depth: 0, direction: 'both' });

    for (const node of neighbourhood.nodes) {
      allTasks.set(node.task.id, node.task);
      nodeDepths.set(node.task.id, {
        depth: node.depth ?? 1,
        direction: node.direction,
      });
    }

    const nodesList = Array.from(allTasks.values());
    const ranks = new Map<string, number>();
    ranks.set(taskId, 0);

    for (const task of nodesList) {
      const info = nodeDepths.get(task.id);
      if (!info) continue;
      if (task.id === taskId) {
        ranks.set(task.id, 0);
        continue;
      }
      const rankValue = info.direction === 'incoming' ? -info.depth : info.depth;
      ranks.set(task.id, rankValue);
    }

    const byRank = new Map<number, ProjectTask[]>();
    for (const task of nodesList) {
      const rank = ranks.get(task.id) ?? 0;
      const row = byRank.get(rank) ?? [];
      row.push(task);
      byRank.set(rank, row);
    }

    for (const [, row] of byRank) {
      row.sort((a, b) => a.title.localeCompare(b.title));
    }

    const nodes = nodesList.map((task) => {
      const rank = ranks.get(task.id) ?? 0;
      const row = byRank.get(rank) ?? [task];
      const index = row.findIndex((entry) => entry.id === task.id);
      const x = (index - (row.length - 1) / 2) * 350;
      const y = rank * 220;
      return { task, x, y, rank };
    });

    return { nodes, allEdges };
  }, [neighbourhood, taskId]);

  useEffect(() => {
    if (mapData.nodes.length === 0) return;

    const viewportWidth = window.innerWidth * 0.58;
    const viewportHeight = Math.max(window.innerHeight * 0.72, 620);
    const xs = mapData.nodes.map((node) => node.x);
    const ys = mapData.nodes.map((node) => node.y);
    const minX = Math.min(...xs) - NODE_WIDTH / 2 - VIEWPORT_PADDING;
    const maxX = Math.max(...xs) + NODE_WIDTH / 2 + VIEWPORT_PADDING;
    const minY = Math.min(...ys) - NODE_HEIGHT / 2 - VIEWPORT_PADDING;
    const maxY = Math.max(...ys) + NODE_HEIGHT / 2 + VIEWPORT_PADDING;

    const contentWidth = Math.max(maxX - minX, NODE_WIDTH + VIEWPORT_PADDING * 2);
    const contentHeight = Math.max(maxY - minY, NODE_HEIGHT + VIEWPORT_PADDING * 2);
    const nextScale = Math.max(
      0.32,
      Math.min(1, Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight))
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setTransform({
      x: -centerX * nextScale,
      y: -centerY * nextScale,
      scale: nextScale,
    });
  }, [mapData.nodes]);

  useEffect(() => {
    if (!keyboardEnabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 40 / transform.scale;
      if (e.key === 'ArrowUp') setTransform(t => ({ ...t, y: t.y + step }));
      if (e.key === 'ArrowDown') setTransform(t => ({ ...t, y: t.y - step }));
      if (e.key === 'ArrowLeft') setTransform(t => ({ ...t, x: t.x + step }));
      if (e.key === 'ArrowRight') setTransform(t => ({ ...t, x: t.x - step }));
      if (e.key === '+' || e.key === '=') setTransform(t => ({ ...t, scale: t.scale * 1.1 }));
      if (e.key === '-' || e.key === '_') setTransform(t => ({ ...t, scale: t.scale * 0.9 }));
      if (e.key === '0') setTransform({ x: 0, y: 0, scale: 0.8 });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardEnabled, transform.scale]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inputMode === 'trackpad') {
      if (e.ctrlKey) setTransform(t => ({ ...t, scale: Math.max(0.1, t.scale * (1 - e.deltaY * 0.01)) }));
      else setTransform(t => ({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY }));
    } else {
      setTransform(t => ({ ...t, scale: Math.max(0.1, t.scale * (1 - e.deltaY * 0.001)) }));
    }
  };

  const linkedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (hoveredNodeId) {
      set.add(hoveredNodeId);
      mapData.allEdges.forEach((e: any) => {
        const sId = typeof e.source === 'string' ? e.source : e.source.id;
        const tId = typeof e.target === 'string' ? e.target : e.target.id;
        if (sId === hoveredNodeId) set.add(tId);
        if (tId === hoveredNodeId) set.add(sId);
      });
    }
    return set;
  }, [hoveredNodeId, mapData.allEdges]);

  return (
    <div 
      className="relative h-full w-full cursor-crosshair overflow-hidden overscroll-none select-none"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(255, 132, 84, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(15, 139, 141, 0.12), transparent 20%), linear-gradient(180deg, #f9f2e9 0%, #f2eadd 100%)'
      }}
      onWheel={handleWheel}
    >
      {/* Interaction Mode Overlay */}
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
        <ControlButton onClick={() => {
          const xs = mapData.nodes.map((node) => node.x);
          const ys = mapData.nodes.map((node) => node.y);
          if (xs.length === 0 || ys.length === 0) {
            setTransform({ x: 0, y: 0, scale: 0.8 });
            return;
          }

          const minX = Math.min(...xs) - NODE_WIDTH / 2 - VIEWPORT_PADDING;
          const maxX = Math.max(...xs) + NODE_WIDTH / 2 + VIEWPORT_PADDING;
          const minY = Math.min(...ys) - NODE_HEIGHT / 2 - VIEWPORT_PADDING;
          const maxY = Math.max(...ys) + NODE_HEIGHT / 2 + VIEWPORT_PADDING;
          const contentWidth = Math.max(maxX - minX, NODE_WIDTH + VIEWPORT_PADDING * 2);
          const contentHeight = Math.max(maxY - minY, NODE_HEIGHT + VIEWPORT_PADDING * 2);
          const viewportWidth = window.innerWidth * 0.58;
          const viewportHeight = Math.max(window.innerHeight * 0.72, 620);
          const nextScale = Math.max(
            0.32,
            Math.min(1, Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight))
          );
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;

          setTransform({ x: -centerX * nextScale, y: -centerY * nextScale, scale: nextScale });
        }} title="Re-center View">
          <Target size={18} />
        </ControlButton>
      </div>

      <div
        className="absolute left-1/2 top-1/2 transition-transform duration-75"
        style={{
          width: WORLD_SIZE,
          height: WORLD_SIZE,
          transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: 'center center',
        }}
      >
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none overflow-visible"
          viewBox={`0 0 ${WORLD_SIZE} ${WORLD_SIZE}`}
        >
          {mapData.allEdges.map((edge: any) => {
            const sId = typeof edge.source === 'string' ? edge.source : edge.source.id;
            const tId = typeof edge.target === 'string' ? edge.target : edge.target.id;
            const s = mapData.nodes.find(n => n.task.id === sId);
            const t = mapData.nodes.find(n => n.task.id === tId);
            if (!s || !t) return null;

            const isHighlight = hoveredNodeId === s.task.id || hoveredNodeId === t.task.id || hoveredEdgeId === edge.id;
            const isDimmed = (hoveredNodeId || hoveredEdgeId) && !isHighlight;
            const color = getLinkLabelColor(edge.label);

            const sx = WORLD_CENTER + s.x;
            const sy = WORLD_CENTER + s.y + (s.task.id === taskId ? 60 : 50);
            const tx = WORLD_CENTER + t.x;
            const ty = WORLD_CENTER + t.y - (t.task.id === taskId ? 60 : 50);

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

        {mapData.nodes.map(node => {
          const isFocus = node.task.id === taskId;
          const isActuallyDimmed = hoveredNodeId && !linkedNodeIds.has(node.task.id);
          const color = node.task.status === 'DONE' ? '#10b981' : node.task.status === 'IN_PROGRESS' ? '#3b82f6' : '#64748b';

          return (
            <div
              key={node.task.id}
              onMouseEnter={() => setHoveredNodeId(node.task.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transform transition-all ${isActuallyDimmed ? 'grayscale opacity-20' : 'opacity-100'}`}
              style={{ left: WORLD_CENTER + node.x, top: WORLD_CENTER + node.y }}
            >
              <div className={`rounded-[28px] border bg-white/92 p-5 shadow-[0_24px_60px_rgba(24,33,47,0.10)] backdrop-blur-xl transition-all duration-500
                ${isFocus ? 'w-72 border-app-accent ring-8 ring-app-accent/10' : 'w-60 border-app-line hover:border-app-ink/20'}
              `}>
                <Link
                  to="/projects/$projectId/tasks/$taskId"
                  params={{ projectId, taskId: node.task.id }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-sm" style={{ backgroundColor: color }}>
                      {node.task.status}
                    </div>
                  </div>
                  <p className={`leading-tight font-black text-app-ink ${isFocus ? 'text-[16px]' : 'text-[14px]'}`}>
                    {node.task.title}
                  </p>
                  {!isFocus && (
                    <p className="mt-2 text-[11px] font-medium text-app-muted">
                      {node.task.team?.name || 'No team assigned'}
                    </p>
                  )}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {hoveredEdgeId && <RelationshipTooltip edgeId={hoveredEdgeId} mapData={mapData} />}

      {/* Dedicated Discovery Expander */}
      {neighbourhood.hasNextPage && fetchNextPage && (
        <div className="absolute bottom-8 right-8 z-50">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="group rounded-full bg-app-accent p-4 text-white shadow-[0_14px_36px_rgba(255,106,61,0.35)] transition-all hover:scale-110 active:scale-95 disabled:scale-100 disabled:opacity-50"
            title="Discover Next Layer"
          >
            {isFetchingNextPage ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <div className="flex items-center gap-2 px-1">
                <PlusCircle size={24} />
                <span className="text-[11px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover:max-w-[120px] transition-all duration-500 whitespace-nowrap">Expand Nexus</span>
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
