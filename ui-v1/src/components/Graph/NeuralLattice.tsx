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
    <div className="lattice-container" style={{ 
      width: '100%', 
      height: '600px', 
      overflow: 'hidden', 
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '12px',
      position: 'relative'
    }}>
      <svg width="1000" height="800" viewBox="0 0 1000 800" style={{ cursor: 'grab' }}>
        {/* Draw Edges */}
        {neighbourhood.edges.map(edge => {
          const source = positionedNodes.find(n => n.task.id === edge.sourceTaskId)?.pos || (edge.sourceTaskId === neighbourhood.focusedTask.id ? center : null);
          const target = positionedNodes.find(n => n.task.id === edge.targetTaskId)?.pos || (edge.targetTaskId === neighbourhood.focusedTask.id ? center : null);

          if (!source || !target) return null;

          return (
            <motion.line
              key={edge.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="var(--border-subtle)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1 }}
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
    </div>
  );
};

const LatticeNode: React.FC<{ task: any, pos: { x: number, y: number }, isFocused?: boolean, direction?: string }> = ({ task, pos, isFocused, direction }) => {
  const color = isFocused 
    ? 'var(--border-focus)' 
    : direction === 'incoming' 
      ? 'var(--accent-incoming)' 
      : 'var(--accent-outgoing)';

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, x: pos.x, y: pos.y }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
    >
      <Link 
        to="/projects/$projectId/tasks/$taskId" 
        params={{ projectId: task.projectId, taskId: task.id }}
      >
        <circle
          r={isFocused ? 12 : 8}
          fill={color}
          stroke="white"
          strokeWidth="2"
          style={{ transition: 'r 0.2s' }}
        />
        <foreignObject x="15" y="-10" width="150" height="40">
          <div style={{ 
            fontSize: '11px', 
            fontWeight: isFocused ? 700 : 500, 
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            backgroundColor: 'var(--glass-bg)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(4px)'
          }}>
            {task.title}
          </div>
        </foreignObject>
      </Link>
    </motion.g>
  );
};
