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
    className={`pointer-events-auto p-3 border rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center
      ${active ? 'bg-focus-blue border-focus-blue text-white' : 'bg-white/88 border-border-notion text-text-dim hover:border-slate-300 hover:text-text-notion'}
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
      className="fixed z-[100] pointer-events-none flex flex-col gap-1 px-4 py-3 bg-white/96 border border-border-notion rounded-xl shadow-xl"
      style={{ left: pos.x + 20, top: pos.y - 40 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-text-notion truncate max-w-[120px]">{s.task.title}</span>
        <div className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: getLinkLabelColor(edge.label) }}>
          {edge.label}
        </div>
        <span className="text-[11px] font-bold text-text-notion truncate max-w-[120px]">{t.task.title}</span>
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
  const [mapData, setMapData] = useState<{ nodes: MapNode[], allEdges: any[] }>({ nodes: [], allEdges: [] });

  useEffect(() => {
    const worker = new Worker(new URL('./layoutWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => setMapData(e.data);
    worker.postMessage({
      pages: [neighbourhood],
      taskId,
      horizontalSpacing: 350,
      verticalSpacing: 220
    });
    return () => worker.terminate();
  }, [neighbourhood, taskId]);

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
      mapData.allEdges.forEach(e => {
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
      className="relative w-full h-full overflow-hidden cursor-crosshair select-none"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(96, 165, 250, 0.12), transparent 24%), linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%)'
      }}
      onWheel={handleWheel}
    >
      {/* Interaction Mode Overlay */}
      <div className="absolute top-8 right-8 z-50 flex gap-2 pointer-events-none">
        <ControlButton onClick={() => setInputMode('mouse')} active={inputMode === 'mouse'} title="Mouse Mode: Scroll to zoom, Drag to pan">
          <MousePointer size={18} />
        </ControlButton>
        <ControlButton onClick={() => setInputMode('trackpad')} active={inputMode === 'trackpad'} title="Trackpad Mode: Two-finger pan, Pinch to zoom">
          <Maximize size={18} />
        </ControlButton>
        <ControlButton onClick={() => setKeyboardEnabled(!keyboardEnabled)} active={keyboardEnabled} title="Keyboard Navigation: Arrow keys to pan">
          <Keyboard size={18} />
        </ControlButton>
        <div className="w-px h-6 bg-border-notion mx-1" />
        <ControlButton onClick={() => setTransform({ x: 0, y: 0, scale: 0.8 })} title="Re-center View">
          <Target size={18} />
        </ControlButton>
      </div>

      <div 
        className="absolute inset-0 transition-transform duration-75"
        style={{ transform: `translate(calc(50% + ${transform.x}px), calc(50% + ${transform.y}px)) scale(${transform.scale})` }}
      >
        <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
          {mapData.allEdges.map(edge => {
            const sId = typeof edge.source === 'string' ? edge.source : edge.source.id;
            const tId = typeof edge.target === 'string' ? edge.target : edge.target.id;
            const s = mapData.nodes.find(n => n.task.id === sId);
            const t = mapData.nodes.find(n => n.task.id === tId);
            if (!s || !t) return null;

            const isHighlight = hoveredNodeId === s.task.id || hoveredNodeId === t.task.id || hoveredEdgeId === edge.id;
            const isDimmed = (hoveredNodeId || hoveredEdgeId) && !isHighlight;
            const color = getLinkLabelColor(edge.label);

            const sx = s.x;
            const sy = s.y + (s.task.id === taskId ? 60 : 50);
            const tx = t.x;
            const ty = t.y - (t.task.id === taskId ? 60 : 50);

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
              className={`absolute transition-all transform -translate-x-1/2 -translate-y-1/2 ${isActuallyDimmed ? 'opacity-20 grayscale' : 'opacity-100'}`}
              style={{ left: node.x, top: node.y }}
            >
              <div className={`p-5 rounded-3xl border transition-all duration-500 bg-white/92 backdrop-blur-xl shadow-[0_20px_50px_rgba(15,23,42,0.08)]
                ${isFocus ? 'w-72 border-focus-blue ring-8 ring-focus-blue/10' : 'w-60 border-border-notion hover:border-slate-300'}
              `}>
                <Link
                  to="/projects/$projectId/tasks/$taskId"
                  params={{ projectId, taskId: node.task.id }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-sm" style={{ backgroundColor: color }}>
                      {node.task.status}
                    </div>
                  </div>
                  <p className={`leading-tight font-black text-text-notion ${isFocus ? 'text-[16px]' : 'text-[14px]'}`}>
                    {node.task.title}
                  </p>
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
            className="p-4 rounded-full bg-focus-blue text-white shadow-[0_12px_30px_rgba(59,130,246,0.3)] hover:scale-110 active:scale-95 transition-all group disabled:opacity-50 disabled:scale-100"
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
