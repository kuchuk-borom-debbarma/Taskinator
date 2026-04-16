import React from 'react';
import { getHashColor } from '../utils/color';

interface Point {
  x: number;
  y: number;
}

interface Connection {
  id: string;
  type: string;
  start: Point;
  end: Point;
  direction: 'in' | 'out';
}

interface RelationshipLinesProps {
  connections: Connection[];
}

/**
 * Renders SVG Bezier curves between tasks to visualize the graph relationships.
 * Each line matches the hashed color of its relationship type.
 */
export const RelationshipLines: React.FC<RelationshipLinesProps> = ({ connections }) => {
  return (
    <svg 
      className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-0"
      aria-hidden="true"
    >
      <defs>
        {connections.map(conn => {
          const colors = getHashColor(conn.type);
          return (
            <linearGradient key={`grad-${conn.id}`} id={`grad-${conn.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={conn.direction === 'in' ? colors.css : 'transparent'} stopOpacity="0.8" />
              <stop offset="100%" stopColor={conn.direction === 'out' ? colors.css : 'transparent'} stopOpacity="0.8" />
            </linearGradient>
          );
        })}
      </defs>

      {connections.map(conn => {
        const colors = getHashColor(conn.type);
        
        // Calculate Bezier control points for a smooth flow
        const dx = Math.abs(conn.end.x - conn.start.x);
        const cp1x = conn.start.x + (conn.direction === 'out' ? dx * 0.5 : -dx * 0.5);
        const cp2x = conn.end.x + (conn.direction === 'out' ? -dx * 0.5 : dx * 0.5);
        
        const d = `M ${conn.start.x} ${conn.start.y} C ${cp1x} ${conn.start.y}, ${cp2x} ${conn.end.y}, ${conn.end.x} ${conn.end.y}`;

        return (
          <g key={conn.id}>
            {/* Glow Path */}
            <path
              d={d}
              fill="none"
              stroke={colors.css}
              strokeWidth="4"
              strokeOpacity="0.1"
              className="animate-pulse"
            />
            {/* Core Path */}
            <path
              d={d}
              fill="none"
              stroke={`url(#grad-${conn.id})`}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="opacity-40"
            >
               <animate 
                 attributeName="stroke-dashoffset" 
                 from="100" to="0" 
                 dur="10s" 
                 repeatCount="indefinite" 
               />
            </path>
          </g>
        );
      })}
    </svg>
  );
};
