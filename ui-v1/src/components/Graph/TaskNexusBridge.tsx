import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import type { TaskNeighbourhood, ProjectTask } from '../../api/types';
import { getLinkLabelColor } from '../../utils/color';

interface TaskNexusBridgeProps {
  neighbourhood: TaskNeighbourhood;
}

export const TaskNexusBridge: React.FC<TaskNexusBridgeProps> = ({ neighbourhood }) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Record<string, DOMRect>>({});

  // 1. Group nodes into structured columns
  const columns = useMemo(() => {
    const cols: Record<string, ProjectTask[]> = {
      'L2': [], // Incoming depth 2
      'L1': [], // Incoming depth 1
      'C': [neighbourhood.focusedTask], // Focus Task
      'R1': [], // Outgoing depth 1
      'R2': [], // Outgoing depth 2
    };

    neighbourhood.nodes.forEach(n => {
      if (n.direction === 'incoming') {
        if (n.depth === 2) cols['L2'].push(n.task);
        else cols['L1'].push(n.task);
      } else {
        if (n.depth === 2) cols['R2'].push(n.task);
        else cols['R1'].push(n.task);
      }
    });

    return cols;
  }, [neighbourhood]);

  // 2. Track positions of all task cards for SVG drawing
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

    updateRects();
    window.addEventListener('resize', updateRects);
    return () => window.removeEventListener('resize', updateRects);
  }, [columns, neighbourhood]);

  // 3. Identify connected tasks for Focus Mode
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
          relative z-10 p-3 rounded-xl border bg-white shadow-sm transition-all duration-300
          ${isFocus ? 'w-56 border-focus-blue ring-4 ring-focus-blue/10 scale-105' : 'w-48 border-border-notion hover:border-text-dim hover:shadow-md'}
          ${isActuallyDimmed ? 'opacity-30 grayscale-[0.5]' : 'opacity-100'}
        `}
      >
        <Link 
          to="/projects/$projectId/tasks/$taskId" 
          params={{ projectId: task.projectId, taskId: task.id }}
          className="block"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${task.status === 'DONE' ? 'bg-done' : task.status === 'IN_PROGRESS' ? 'bg-incoming' : 'bg-todo'}`} />
            <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">{task.status}</span>
          </div>
          <p className={`text-xs leading-tight line-clamp-2 ${isFocus ? 'font-extrabold' : 'font-bold'} text-text-notion`}>
            {task.title}
          </p>
        </Link>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full min-h-[500px] bg-bg-secondary p-8 overflow-x-auto">
      {/* SVG Connection Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {neighbourhood.edges.map(edge => {
          const sourceRect = rects[edge.sourceTaskId];
          const targetRect = rects[edge.targetTaskId];
          if (!sourceRect || !targetRect) return null;

          const isDimmed = hoveredNodeId && edge.sourceTaskId !== hoveredNodeId && edge.targetTaskId !== hoveredNodeId;
          const color = getLinkLabelColor(edge.label);

          // Calculate connection points
          const startX = sourceRect.x + sourceRect.width;
          const startY = sourceRect.y + sourceRect.height / 2;
          const endX = targetRect.x;
          const endY = targetRect.y + targetRect.height / 2;

          // Draw a clean, non-overlapping cubic bezier curve
          const cp1 = startX + (endX - startX) * 0.4;
          const cp2 = endX - (endX - startX) * 0.4;

          const path = `M ${startX} ${startY} C ${cp1} ${startY}, ${cp2} ${endY}, ${endX} ${endY}`;

          return (
            <g key={edge.id} className="transition-all duration-300" style={{ opacity: isDimmed ? 0.05 : 1 }}>
              <path 
                d={path} 
                fill="none" 
                stroke={color} 
                strokeWidth={isDimmed ? 1 : 2.5}
                strokeOpacity={isDimmed ? 0.2 : 0.6}
                className="transition-all"
              />
              
              {/* Relationship Label Badge */}
              <foreignObject
                x={(startX + endX) / 2 - 40}
                y={(startY + endY) / 2 - 10}
                width="80"
                height="20"
                className="overflow-visible pointer-events-none"
              >
                <div 
                  className="flex items-center justify-center h-full transition-opacity duration-300"
                  style={{ opacity: isDimmed ? 0 : 1 }}
                >
                  <div 
                    className="px-1.5 py-0.5 rounded shadow-sm border border-white/20 text-[9px] font-bold text-white whitespace-nowrap"
                    style={{ backgroundColor: color }}
                  >
                    {edge.label}
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      {/* Grid Columns */}
      <div className="flex justify-between items-center min-w-[1200px] h-full gap-8">
        {['L2', 'L1', 'C', 'R1', 'R2'].map(colKey => (
          <div key={colKey} className="flex-1 flex flex-col gap-6 items-center">
            {columns[colKey].map(task => renderTaskCard(task, colKey === 'C'))}
            {columns[colKey].length === 0 && (
              <div className="h-20 w-48 border-2 border-dashed border-border-notion/30 rounded-xl flex items-center justify-center">
                <span className="text-[10px] font-bold text-text-dim uppercase tracking-tighter opacity-40">No {colKey.startsWith('L') ? 'Incoming' : 'Outgoing'}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <div className="bg-white/80 backdrop-blur border border-border-notion px-2.5 py-1 rounded-md text-[9px] font-bold uppercase text-text-dim tracking-wider shadow-sm">
          The Nexus Bridge v1
        </div>
      </div>
    </div>
  );
};
