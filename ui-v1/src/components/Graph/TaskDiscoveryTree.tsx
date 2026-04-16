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
  const containerRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Record<string, DOMRect>>({});

  // 1. Structural Grouping Logic
  // We need to group tasks by Depth AND by Relationship Label relative to the parent
  const orchard = useMemo(() => {
    const depthKeys = ['L3', 'L2', 'L1', 'C', 'R1', 'R2', 'R3'];
    const levels: Record<string, DiscoveryGroup[]> = {
      'L3': [], 'L2': [], 'L1': [], 'C': [], 'R1': [], 'R2': [], 'R3': []
    };

    // Center Task
    levels['C'].push({ label: 'Focus', tasks: [neighbourhood.focusedTask], color: '#3b82f6' });

    // Grouping helper
    const groupTasks = (tasks: { task: ProjectTask; depth: number; direction: 'incoming' | 'outgoing' }[]) => {
      const grouped: Record<string, Record<string, ProjectTask[]>> = {};

      tasks.forEach(n => {
        const sidePrefix = n.direction === 'incoming' ? 'L' : 'R';
        const key = `${sidePrefix}${n.depth}`;
        if (!grouped[key]) grouped[key] = {};

        // Find the link relationship to the focused task or intermediate parent
        // For simplicity in V1, we find the link connecting this task to the neighbourhood
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
        if (id) {
          const rect = el.getBoundingClientRect();
          newRects[id] = {
            ...rect,
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
          } as DOMRect;
        }
      });
      setRects(newRects);
    };

    const timer = setTimeout(updateRects, 100); // Wait for initial render
    window.addEventListener('resize', updateRects);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRects);
    }
  }, [orchard, neighbourhood]);

  // 3. Focus Mode Logic
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
          flex flex-col gap-1 p-2 rounded-lg border bg-white shadow-sm transition-all duration-300
          ${isFocus ? 'w-52 border-focus-blue ring-4 ring-focus-blue/10' : 'w-44 border-border-notion hover:border-text-dim hover:shadow-md'}
          ${isActuallyDimmed ? 'opacity-30' : 'opacity-100'}
        `}
      >
        <Link 
          to="/projects/$projectId/tasks/$taskId" 
          params={{ projectId: task.projectId, taskId: task.id }}
          className="group"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full ${task.status === 'DONE' ? 'bg-done' : task.status === 'IN_PROGRESS' ? 'bg-incoming' : 'bg-todo'}`} />
            <span className="text-[9px] font-bold text-text-dim uppercase tracking-wider">{task.status}</span>
          </div>
          <p className="text-[11px] leading-tight line-clamp-2 font-bold text-text-notion group-hover:text-focus-blue transition-colors">
            {task.title}
          </p>
        </Link>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full min-h-[600px] bg-bg-secondary p-12 overflow-x-auto">
      {/* SVG Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {neighbourhood.edges.map(edge => {
          const sourceRect = rects[edge.sourceTaskId];
          const targetRect = rects[edge.targetTaskId];
          if (!sourceRect || !targetRect) return null;

          const isDimmed = hoveredNodeId && edge.sourceTaskId !== hoveredNodeId && edge.targetTaskId !== hoveredNodeId;
          const color = getLinkLabelColor(edge.label);

          const startX = sourceRect.x + sourceRect.width;
          const startY = sourceRect.y + sourceRect.height / 2;
          const endX = targetRect.x;
          const endY = targetRect.y + targetRect.height / 2;

          const cp1 = startX + (endX - startX) * 0.4;
          const cp2 = endX - (endX - startX) * 0.4;

          return (
            <path 
              key={edge.id}
              d={`M ${startX} ${startY} C ${cp1} ${startY}, ${cp2} ${endY}, ${endX} ${endY}`} 
              fill="none" 
              stroke={color} 
              strokeWidth={isDimmed ? 1 : 2}
              strokeOpacity={isDimmed ? 0.05 : 0.4}
              className="transition-all duration-300"
            />
          );
        })}
      </svg>

      {/* Grid Columns (The Orchard) */}
      <div className="flex justify-between items-start min-w-[1600px] h-full gap-12">
        {orchard.keys.map(key => (
          <div key={key} className="flex-1 flex flex-col gap-8 pt-4">
            {orchard.levels[key].map((group, gIdx) => (
              <div key={`${key}-${gIdx}`} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-4 w-1 rounded-full" style={{ backgroundColor: group.color }} />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-dim">{group.label}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white border border-border-notion rounded text-text-dim">{group.tasks.length}</span>
                </div>
                <div className="flex flex-col gap-2 scale-95 origin-top">
                  {group.tasks.map(task => renderTaskCard(task, key === 'C'))}
                </div>
              </div>
            ))}
            {orchard.levels[key].length === 0 && (
              <div className="h-32 w-44 border-2 border-dashed border-border-notion/20 rounded-xl flex items-center justify-center">
                <span className="text-[9px] font-bold text-text-dim uppercase tracking-tighter opacity-30">Level Empty</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-white border border-border-notion px-4 py-1.5 rounded-full shadow-sm flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-incoming/40" />
            <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Ancestry (L3)</span>
          </div>
          <div className="h-3 w-px bg-border-notion" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-focus-blue uppercase tracking-wider">focused task</span>
          </div>
          <div className="h-3 w-px bg-border-notion" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Successors (R3)</span>
            <div className="w-2 h-2 rounded-full bg-done/40" />
          </div>
        </div>
      </div>
    </div>
  );
};
