import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { TaskNeighbourhood } from '../../api/types';
import { calculateRadialLayout } from '../../utils/radialLayout';
import { Link } from '@tanstack/react-router';

interface NeuralLatticeProps {
  neighbourhood: TaskNeighbourhood;
}

export const NeuralLattice: React.FC<NeuralLatticeProps> = ({ neighbourhood }) => {
  const center = { x: 500, y: 400 };
  const positionedNodes = useMemo(() => 
    calculateRadialLayout(center, neighbourhood.nodes), 
    [neighbourhood.nodes]
  );

  return (
    <div className="w-full aspect-[5/4] sm:aspect-[4/3] bg-bg-secondary relative overflow-hidden group">
      <svg 
        viewBox="0 0 1000 800" 
        className="w-full h-full cursor-grab active:cursor-grabbing preserve-3d"
      >
        <defs>
          <filter id="glass" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>

        {/* Draw Edges */}
        {neighbourhood.edges.map(edge => {
          const source = positionedNodes.find(n => n.task.id === edge.sourceTaskId)?.pos || (edge.sourceTaskId === neighbourhood.focusedTask.id ? center : null);
          const target = positionedNodes.find(n => n.task.id === edge.targetTaskId)?.pos || (edge.targetTaskId === neighbourhood.focusedTask.id ? center : null);

          if (!source || !target) return null;

          return (
            <motion.line
              key={edge.id}
              x1={source.x} y1={source.y}
              x2={target.x} y2={target.y}
              className="stroke-border-notion/40"
              strokeWidth="1.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          );
        })}

        {/* Draw Center Node */}
        <LatticeNode task={neighbourhood.focusedTask} pos={center} isFocused />

        {/* Draw Neighbour Nodes */}
        {positionedNodes.map(node => (
          <LatticeNode 
            key={node.task.id} 
            task={node.task} 
            pos={node.pos} 
            direction={node.direction}
          />
        ))}
      </svg>

      {/* Graph Control Overlay (Placeholder for Pan/Zoom hints) */}
      <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-white/80 backdrop-blur border border-border-notion px-2 py-1 rounded-md text-[9px] font-bold uppercase text-text-dim">
          Radial Layout V2
        </div>
      </div>
    </div>
  );
};

interface NodeProps { 
  task: any; 
  pos: { x: number; y: number }; 
  isFocused?: boolean; 
  direction?: string; 
}

const LatticeNode: React.FC<NodeProps> = ({ task, pos, isFocused, direction }) => {
  const colorClass = isFocused 
    ? 'fill-focus-blue' 
    : direction === 'incoming' 
      ? 'fill-incoming' 
      : 'fill-outgoing';

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, x: pos.x, y: pos.y }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      className="cursor-pointer"
    >
      <Link 
        to="/projects/$projectId/tasks/$taskId" 
        params={{ projectId: task.projectId, taskId: task.id }}
      >
        <circle
          r={isFocused ? 12 : 8}
          className={`${colorClass} stroke-white stroke-2 drop-shadow-sm transition-all duration-300 hover:r-14`}
        />
        <foreignObject x="18" y="-12" width="160" height="40">
          <div className="flex items-center">
            <div className="bg-white/80 backdrop-blur-sm border border-border-notion px-2.5 py-1 rounded-lg shadow-sm">
              <span className={`text-[11px] whitespace-nowrap leading-none ${isFocused ? 'font-bold text-text-notion' : 'font-medium text-text-notion/80'}`}>
                {task.title}
              </span>
            </div>
          </div>
        </foreignObject>
      </Link>
    </motion.g>
  );
};
