import { useEffect, useState, useMemo } from 'react';
import { 
  forceSimulation, 
  forceLink, 
  forceManyBody, 
  forceX, 
  forceY, 
  forceCenter 
} from 'd3-force';
import type { Node, Edge } from '@xyflow/react';

export function useTaskGraphLayout(initialNodes: Node[], initialEdges: Edge[], center: { x: number, y: number }) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);

  const simulationNodes = useMemo(() => {
    return initialNodes.map(node => ({
      ...node,
      x: node.position.x,
      y: node.position.y,
    }));
  }, [initialNodes]);

  const simulationEdges = useMemo(() => {
    return initialEdges.map(edge => ({
      ...edge,
      source: edge.source,
      target: edge.target,
    }));
  }, [initialEdges]);

  useEffect(() => {
    if (simulationNodes.length === 0) return;

    // Create simulation
    const simulation = forceSimulation(simulationNodes as any)
      .force('link', forceLink(simulationEdges as any).id((d: any) => d.id).distance(250))
      .force('charge', forceManyBody().strength(-3000))
      .force('center', forceCenter(center.x, center.y))
      .force('x', forceX((d: any) => {
        const depth = d.data.depth || 1;
        if (d.data.direction === 'incoming') return center.x - (depth * 300);
        if (d.data.direction === 'outgoing') return center.x + (depth * 300);
        return center.x;
      }).strength(2.0))
      .force('y', forceY(center.y).strength(0.1))
      .stop();

    // Settle simulation
    for (let i = 0; i < 300; i++) simulation.tick();

    // Map settled positions back
    const positionedNodes = simulationNodes.map((simNode: any) => {
      const originalNode = initialNodes.find(n => n.id === simNode.id);
      return {
        ...(originalNode || {}),
        id: simNode.id,
        type: simNode.type,
        data: simNode.data,
        draggable: simNode.draggable,
        position: simNode.data.isFocused 
          ? center 
          : { x: simNode.x, y: simNode.y },
      } as Node;
    });

    setNodes(positionedNodes);

  }, [simulationNodes, simulationEdges, initialNodes, center]);

  return { nodes, edges: initialEdges };
}
