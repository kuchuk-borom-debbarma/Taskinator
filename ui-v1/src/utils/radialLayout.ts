import type { NeighbourhoodNode } from '../api/types';

export interface Point {
  x: number;
  y: number;
}

export interface PositionedNode extends NeighbourhoodNode {
  pos: Point;
}

/**
 * Distributes nodes radially around a center point based on depth and direction.
 */
export function calculateRadialLayout(
  center: Point,
  nodes: NeighbourhoodNode[],
  radiusStep: number = 180
): PositionedNode[] {
  const positionedNodes: PositionedNode[] = [];

  // Group by depth
  const depthGroups: Record<number, NeighbourhoodNode[]> = {};
  nodes.forEach(n => {
    if (!depthGroups[n.depth]) depthGroups[n.depth] = [];
    depthGroups[n.depth].push(n);
  });

  Object.entries(depthGroups).forEach(([depthStr, group]) => {
    const depth = parseInt(depthStr, 10);
    const radius = depth * radiusStep;

    // Split into incoming and outgoing to place on separate hemispheres
    const incoming = group.filter(n => n.direction === 'incoming');
    const outgoing = group.filter(n => n.direction === 'outgoing');
    const both = group.filter(n => n.direction === 'both');

    // Outgoing nodes (Right side: -70deg to +70deg range approx)
    placeGroup(outgoing, radius, -Math.PI / 3, Math.PI / 3, center, positionedNodes);
    
    // Incoming nodes (Left side: 110deg to 250deg range approx)
    placeGroup(incoming, radius, (2 * Math.PI) / 3, (4 * Math.PI) / 3, center, positionedNodes);
    
    // 'Both' nodes (Top/Bottom center)
    placeGroup(both, radius, -Math.PI / 10, Math.PI / 10, center, positionedNodes, true);
  });

  return positionedNodes;
}

function placeGroup(
  group: NeighbourhoodNode[],
  radius: number,
  startAngle: number,
  endAngle: number,
  center: Point,
  result: PositionedNode[],
  vertical: boolean = false
) {
  if (group.length === 0) return;

  const angleStep = group.length > 1 ? (endAngle - startAngle) / (group.length - 1) : 0;
  const actualStart = group.length === 1 ? (startAngle + endAngle) / 2 : startAngle;

  group.forEach((node, i) => {
    const angle = vertical ? (Math.PI / 2) + (i * 0.2) : actualStart + (i * angleStep);
    result.push({
      ...node,
      pos: {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      }
    });
  });
}
