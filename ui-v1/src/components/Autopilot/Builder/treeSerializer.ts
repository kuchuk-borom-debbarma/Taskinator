import type { Node, Edge } from '@xyflow/react';
import type { AutopilotConditionNode } from '../../../api/interfaces/AutopilotAPI';
import type { LogicalNodeData, PredicateNodeData } from './types';

const COL_WIDTH = 270;
const ROW_HEIGHT = 130;

interface TraversalResult {
  nodes: Node[];
  edges: Edge[];
}

let _nodeCounter = 0;

function traverse(
  node: AutopilotConditionNode,
  parentId: string | null,
  depth: number,
  siblingIndex: number,
  result: TraversalResult,
): number {
  const id = `node-${_nodeCounter++}`;
  const x = depth * COL_WIDTH;
  const y = siblingIndex * ROW_HEIGHT;

  if (node.type === 'predicate') {
    result.nodes.push({
      id,
      type: 'predicateNode',
      position: { x, y },
      data: {
        domain: node.domain ?? 'task',
        field: node.field ?? 'status',
        operator: node.operator ?? '==',
        value: String(node.value ?? ''),
      } satisfies PredicateNodeData,
    });
  } else {
    // logicalNode
    result.nodes.push({
      id,
      type: 'logicalNode',
      position: { x, y },
      data: {
        logicalType: node.type as 'and' | 'or' | 'not',
      } satisfies LogicalNodeData,
    });
  }

  if (parentId !== null) {
    result.edges.push({
      id: `edge-${parentId}-${id}`,
      source: parentId,
      target: id,
      type: 'smoothstep',
      style: { stroke: 'rgba(24, 33, 47, 0.18)', strokeWidth: 2 },
    });
  }

  // Recurse into children
  const children = node.children ?? (node.child ? [node.child] : []);
  let rowOffset = siblingIndex;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child) {
      rowOffset = traverse(child, id, depth + 1, rowOffset, result);
    }
    if (i < children.length - 1) rowOffset++;
  }

  return rowOffset;
}

/**
 * Converts a recursive ConditionTree JSON into flat XYFlow nodes[] + edges[].
 * Returns the root node ID so the canvas knows where to start serialisation.
 */
export function conditionTreeToGraph(root: AutopilotConditionNode): {
  nodes: Node[];
  edges: Edge[];
  rootId: string;
} {
  _nodeCounter = 0;
  const result: TraversalResult = { nodes: [], edges: [] };
  traverse(root, null, 0, 0, result);
  const rootId = result.nodes[0]?.id ?? 'node-0';
  return { ...result, rootId };
}
