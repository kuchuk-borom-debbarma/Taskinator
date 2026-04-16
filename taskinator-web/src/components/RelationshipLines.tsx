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
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" fillOpacity="0.2" />
        </marker>
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
        
        // Calculate dynamic Bezier control points for arbitrary 2D orientation
        const dx = conn.end.x - conn.start.x;
        const dy = conn.end.y - conn.start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Curvature strength based on distance, but capped for stability
        const curvature = Math.min(dist * 0.3, 100);
        
        // Primary flow direction (horizontal-leaning for mind map feel)
        const cp1x = conn.start.x + (dx > 0 ? curvature : -curvature);
        const cp2x = conn.end.x - (dx > 0 ? curvature : -curvature);
        
        const d = `M ${conn.start.x} ${conn.start.y} C ${cp1x} ${conn.start.y}, ${cp2x} ${conn.end.y}, ${conn.end.x} ${conn.end.y}`;

        return (
          <g key={conn.id} className="transition-opacity duration-1000">
            {/* ID for textPath referencing */}
            <path id={`path-${conn.id}`} d={d} fill="none" />

            {/* Shadow/Glow Path */}
            <path
              d={d}
              fill="none"
              stroke={colors.css}
              strokeWidth="8"
              strokeOpacity="0.03"
            />

            {/* Core Path with Animation */}
            <path
              d={d}
              fill="none"
              stroke={colors.css}
              strokeWidth="1.2"
              strokeOpacity="0.25"
              strokeDasharray="3 8"
              markerEnd="url(#arrowhead)"
              className="transition-all duration-300"
            >
               <animate 
                 attributeName="stroke-dashoffset" 
                 from="100" to="0" 
                 dur={`${Math.max(3, dist / 80)}s`} 
                 repeatCount="indefinite" 
               />
            </path>

            {/* Label Overlay - Using textPath for perfect alignment */}
            <text dy="-6" className="font-black uppercase tracking-[0.3em] pointer-events-none fill-current opacity-40 select-none italic" style={{ fontSize: '7px', fill: colors.css }}>
              <textPath 
                href={`#path-${conn.id}`} 
                startOffset="50%" 
                textAnchor="middle"
              >
                {conn.type}
              </textPath>
            </text>
          </g>
        );
      })}
    </svg>
  );
};
