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
  const [depthL, setDepthL] = useState(1); // Start with direct links only
  const [depthR, setDepthR] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Record<string, DOMRect>>({});

  // 1. Structural Grouping Logic
  const orchard = useMemo(() => {
    const depthKeys = ['L3', 'L2', 'L1', 'C', 'R1', 'R2', 'R3'];
    const levels: Record<string, DiscoveryGroup[]> = {
      'L3': [], 'L2': [], 'L1': [], 'C': [], 'R1': [], 'R2': [], 'R3': []
    };

    levels['C'].push({ label: 'Focused Mission', tasks: [neighbourhood.focusedTask], color: '#3b82f6' });

    const groupTasks = (tasks: { task: ProjectTask; depth: number; direction: 'incoming' | 'outgoing' }[]) => {
      const grouped: Record<string, Record<string, ProjectTask[]>> = {};

      tasks.forEach(n => {
        const sidePrefix = n.direction === 'incoming' ? 'L' : 'R';
        const key = `${sidePrefix}${n.depth}`;
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
        if (levels[lvl]) {
          Object.entries(labelMap).forEach(([label, tasks]) => {
            levels[lvl].push({ label, tasks, color: getLinkLabelColor(label) });
          });
        }
      });
    };

    groupTasks(neighbourhood.nodes as any);
    return { levels, keys: depthKeys };
  }, [neighbourhood]);

  // 2. Position Tracking
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

    const timer = setTimeout(updateRects, 150);
    window.addEventListener('resize', updateRects);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRects);
    }
  }, [orchard, depthL, depthR, neighbourhood]);

  // Visibility Filter
  const isColVisible = (key: string) => {
    if (key === 'C') return true;
    const depth = parseInt(key.substring(1));
    return key.startsWith('L') ? depth <= depthL : depth <= depthR;
  };

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
          ${isFocus ? 'w-60 border-focus-blue ring-8 ring-focus-blue/5' : 'w-48 border-border-notion hover:border-text-dim hover:shadow-md'}
          ${isActuallyDimmed ? 'opacity-30' : 'opacity-100'}
        `}
      >
        <Link 
          to="/projects/$projectId/tasks/$taskId" 
          params={{ projectId: task.projectId, taskId: task.id }}
          className="group"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${task.status === 'DONE' ? 'bg-done' : task.status === 'IN_PROGRESS' ? 'bg-incoming' : 'bg-todo'}`} />
            <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">{task.status}</span>
          </div>
          <p className={`leading-tight font-bold text-text-notion group-hover:text-focus-blue transition-colors ${isFocus ? 'text-[13px]' : 'text-[11px]'}`}>
            {task.title}
          </p>
        </Link>
      </div>
    );
  };

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

  return (
    <div ref={containerRef} className="relative w-full min-h-[600px] py-12 px-20">
      {/* Dynamic Symmetrical Paths */}
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
              d={`M ${startX} ${startY} C ${startX + 40} ${startY}, ${endX - 40} ${endY}, ${endX} ${endY}`} 
              fill="none" 
              stroke={color} 
              strokeWidth={isDimmed ? 1 : 2.5}
              strokeOpacity={isDimmed ? 0.05 : 0.3}
              className="transition-all duration-300"
            />
          );
        })}
      </svg>

      {/* The Orchard Matrix */}
      <div className="flex justify-center items-start gap-16 min-w-max mx-auto">
        {orchard.keys.map(key => {
          const visible = isColVisible(key);
          if (!visible) return null;

          return (
            <div key={key} className="flex flex-col gap-10 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {orchard.levels[key].map((group, groupIdx) => (
                <div key={groupIdx} className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 group/header">
                    <div className="h-4 w-1 rounded-full transition-transform group-hover/header:scale-y-125" style={{ backgroundColor: group.color }} />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-text-dim/80">{group.label}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white border border-border-notion rounded text-text-dim">{group.tasks.length}</span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {group.tasks.map(task => renderTaskCard(task, key === 'C'))}
                  </div>
                </div>
              ))}

              {/* Expansion Handlers */}
              {key === 'L' + depthL && depthL < 3 && (
                <button 
                  onClick={() => setDepthL(d => d + 1)}
                  className="mt-4 self-center p-2 rounded-full border border-border-notion bg-white hover:bg-bg-secondary hover:border-text-dim transition-all shadow-sm group"
                >
                  <div className="text-[10px] font-extrabold uppercase tracking-tighter text-text-dim group-hover:text-text-notion px-2">Expand Ancestry</div>
                </button>
              )}
              {key === 'R' + depthR && depthR < 3 && (
                <button 
                  onClick={() => setDepthR(d => d + 1)}
                  className="mt-4 self-center p-2 rounded-full border border-border-notion bg-white hover:bg-bg-secondary hover:border-text-dim transition-all shadow-sm group"
                >
                  <div className="text-[10px] font-extrabold uppercase tracking-tighter text-text-dim group-hover:text-text-notion px-2">Expand Successors</div>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-4 right-8 pointer-events-none opacity-50">
        <div className="text-[10px] font-black uppercase tracking-widest text-text-dim">Neural Orchard v2</div>
      </div>
    </div>
  );
};
