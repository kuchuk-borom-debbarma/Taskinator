import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import type { TaskNeighbourhood, ProjectTask } from '../../api/types';
import { getLinkLabelColor } from '../../utils/color';

interface TaskDiscoveryTreeProps {
  neighbourhood: TaskNeighbourhood;
}

interface DiscoveryGroup {
  label: string;
  tasks: ProjectTask[];
  color: string;
}

export const TaskDiscoveryTree: React.FC<TaskDiscoveryTreeProps> = ({ neighbourhood }) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [viewDepthL, setViewDepthL] = useState(3); // Start with Depth 3 by default
  const [viewDepthR, setViewDepthR] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Record<string, DOMRect>>({});

  // 1. Dynamic Orchard Generation
  const orchard = useMemo(() => {
    // Determine the max depth available in the current data
    const maxDataDepthL = Math.max(0, ...neighbourhood.nodes.filter(n => n.direction === 'incoming').map(n => n.depth));
    const maxDataDepthR = Math.max(0, ...neighbourhood.nodes.filter(n => n.direction === 'outgoing').map(n => n.depth));

    // Determine the columns to render based on current view state
    const currentMaxL = Math.min(viewDepthL, maxDataDepthL);
    const currentMaxR = Math.min(viewDepthR, maxDataDepthR);

    const keys: string[] = [];
    for (let i = currentMaxL; i >= 1; i--) keys.push(`L${i}`);
    keys.push('C');
    for (let i = 1; i <= currentMaxR; i++) keys.push(`R${i}`);

    const levels: Record<string, DiscoveryGroup[]> = {};
    keys.forEach(k => levels[k] = []);

    // Focus Point
    levels['C'].push({ label: 'Focused Mission', tasks: [neighbourhood.focusedTask], color: '#3b82f6' });

    // Grouping Engine
    const grouped: Record<string, Record<string, ProjectTask[]>> = {};
    neighbourhood.nodes.forEach(n => {
      const sidePrefix = n.direction === 'incoming' ? 'L' : 'R';
      const key = `${sidePrefix}${n.depth}`;
      if (!levels[key]) return; // Skip if beyond current view depth
      
      if (!grouped[key]) grouped[key] = {};
      const link = neighbourhood.edges.find(e => 
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

    return { levels, keys, maxDataDepthL, maxDataDepthR };
  }, [neighbourhood, viewDepthL, viewDepthR]);

  // 2. Rect Tracking for SVG
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
  }, [orchard, neighbourhood]);

  const isColVisible = (key: string) => orchard.keys.includes(key);

  const linkedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (hoveredNodeId) {
      set.add(hoveredNodeId);
      neighbourhood.edges.forEach(e => {
        if (e.sourceTaskId === hoveredNodeId) set.add(e.targetTaskId);
        if (e.targetTaskId === hoveredNodeId) set.add(e.sourceTaskId);
      });
    }
    return set;
  }, [hoveredNodeId, neighbourhood.edges]);

  const renderTaskCard = (task: ProjectTask, isFocus = false) => {
    const isActuallyDimmed = hoveredNodeId && !linkedNodeIds.has(task.id);
    
    return (
      <div 
        key={task.id}
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
    <div ref={containerRef} className="relative w-full min-h-[700px] py-16 px-24">
      {/* Strategic Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {neighbourhood.edges.map(edge => {
          const sourceVisible = isColVisible(orchard.keys.find(k => orchard.levels[k].some(g => g.tasks.some(t => t.id === edge.sourceTaskId))) || '');
          const targetVisible = isColVisible(orchard.keys.find(k => orchard.levels[k].some(g => g.tasks.some(t => t.id === edge.targetTaskId))) || '');
          
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
      <div className="flex justify-center items-start gap-20 min-w-max mx-auto">
        {orchard.keys.map(key => {
          const isL = key.startsWith('L');
          const isR = key.startsWith('R');

          return (
            <div key={key} className="flex flex-col gap-12 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Expansion Handler (Left/Inner) */}
              {key === 'L' + viewDepthL && viewDepthL < orchard.maxDataDepthL && (
                <button 
                  onClick={() => setViewDepthL(d => d + 1)}
                  className="mb-6 self-center flex items-center gap-2 px-4 py-2 rounded-full border border-border-notion bg-white hover:bg-bg-secondary hover:border-text-notion transition-all shadow-sm group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-focus-blue animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-dim group-hover:text-text-notion">Reveal Ancestry</span>
                </button>
              )}

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

              {/* Expansion Handler (Right/Inner) */}
              {key === 'R' + viewDepthR && viewDepthR < orchard.maxDataDepthR && (
                <button 
                  onClick={() => setViewDepthR(d => d + 1)}
                  className="mt-6 self-center flex items-center gap-2 px-4 py-2 rounded-full border border-border-notion bg-white hover:bg-bg-secondary hover:border-text-notion transition-all shadow-sm group"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-dim group-hover:text-text-notion">Reveal Successors</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-focus-blue animate-pulse" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-6 right-10 pointer-events-none opacity-40">
        <div className="text-[11px] font-black uppercase tracking-[0.3em] text-text-dim">Neural Orchard • Infinite Discovery</div>
      </div>
    </div>
  );
};
