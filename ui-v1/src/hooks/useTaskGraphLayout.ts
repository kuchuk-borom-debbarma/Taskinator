import { useEffect, useMemo } from 'react';
import { 
  forceSimulation, 
  forceLink, 
  forceManyBody, 
  forceX, 
  forceY, 
  forceCenter 
} from 'd3-force';
import type { Node, Edge } from '@xyflow/react';

export function useTaskGraphLayout(nodes: Node[], edges: Edge[], center: { x: number, y: number }) {
  const simulationNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      // Initial positions based on current node position or center
      x: node.position.x,
      y: node.position.y,
    }));
  }, [nodes]);

  const simulationEdges = useMemo(() => {
    return edges.map(edge => ({
      source: edge.source,
      target: edge.target,
    }));
  }, [edges]);

  useEffect(() => {
    if (simulationNodes.length === 0) return;

    // Create simulation
    const simulation = forceSimulation(simulationNodes as any)
      .force('link', forceLink(simulationEdges as any).id((d: any) => d.id).distance(150))
      .force('charge', forceManyBody().strength(-1500)) // Strong push to avoid overlaps
      .force('center', forceCenter(center.x, center.y))
      .force('x', forceX((d: any) => {
        // Gently nudge based on direction
        if (d.data.direction === 'incoming') return center.x - 250;
        if (d.data.direction === 'outgoing') return center.x + 250;
        return center.x;
      }).strength(0.5))
      .force('y', forceY(center.y).strength(0.1)) // Keep things vertically centered
      .stop();

    // Run simulation for enough ticks to settle
    for (let i = 0; i < 300; i++) simulation.tick();

    // Apply computed positions back to React Flow nodes
    simulationNodes.forEach((simNode: any) => {
      const node = nodes.find(n => n.id === simNode.id);
      if (node) {
        // The central/focused task should be pinned exactly at center
        if (simNode.data.isFocused) {
          node.position = center;
        } else {
          node.position = { x: simNode.x, y: simNode.y };
        }
      }
    });

  }, [simulationNodes, simulationEdges, nodes, center]);

  return { nodes, edges };
}
