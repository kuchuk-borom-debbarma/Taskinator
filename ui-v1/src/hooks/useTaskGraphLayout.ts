import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';

interface GraphNodeData {
  direction?: 'incoming' | 'outgoing' | 'both';
  isFocused?: boolean;
  depth?: number;
}

const COLUMN_WIDTH = 320;
const NODE_SPACING_Y = 140;

export function useTaskGraphLayout(initialNodes: Node[], initialEdges: Edge[], center: { x: number, y: number }) {
  const nodes = useMemo(() => {
    const positionedNodes = [...initialNodes];
    
    // 1. Group nodes by their "Lane" (Direction + Depth)
    const lanes: Record<string, Node[]> = {};
    
    positionedNodes.forEach(node => {
      const data = node.data as GraphNodeData;
      if (data.isFocused) return; 
      
      const direction = data.direction; 
      const depth = data.depth || 1;
      const laneKey = `${direction}-${depth}`;
      
      if (!lanes[laneKey]) lanes[laneKey] = [];
      lanes[laneKey].push(node);
    });

    // 2. Position nodes within each lane (Tournament style vertical centering)
    Object.entries(lanes).forEach(([laneKey, laneNodes]) => {
      const [direction, depthStr] = laneKey.split('-');
      const depth = parseInt(depthStr, 10);
      
      // Calculate X based on direction and depth
      const xOffset = direction === 'incoming' 
        ? -depth * COLUMN_WIDTH 
        : depth * COLUMN_WIDTH;
      
      const laneX = center.x + xOffset;
      
      // Calculate Y starting point (centered on center.y)
      const totalLaneHeight = (laneNodes.length - 1) * NODE_SPACING_Y;
      const startY = center.y - (totalLaneHeight / 2);
      
      laneNodes.forEach((node, index) => {
        node.position = {
          x: laneX,
          y: startY + (index * NODE_SPACING_Y)
        };
      });
    });

    // Final check: ensure focused task is strictly anchored
    const focusedTask = positionedNodes.find(n => n.data.isFocused);
    if (focusedTask) {
      focusedTask.position = center;
    }

    return positionedNodes;
  }, [initialNodes, center]);

  return { nodes, edges: initialEdges };
}
