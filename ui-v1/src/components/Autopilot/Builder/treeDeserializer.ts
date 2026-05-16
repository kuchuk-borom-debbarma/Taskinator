import type { Node, Edge } from '@xyflow/react';
import type { ConditionNode } from '../../../gql/graphql';
import type { LogicalNodeData, PredicateNodeData } from './types';

/**
 * Converts XYFlow nodes[] + edges[] back into a recursive ConditionTree JSON.
 */
export function graphToConditionTree(
  nodes: Node[],
  edges: Edge[],
  rootId: string,
): ConditionNode {
  // Build adjacency list: parentId → childIds[]
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    const existing = children.get(edge.source) ?? [];
    existing.push(edge.target);
    children.set(edge.source, existing);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function reconstruct(id: string): ConditionNode {
    const node = nodeMap.get(id);
    if (!node) {
      // Fallback — should never happen in valid graphs
      return { __typename: 'PredicateNode', domain: 'task', field: 'status', operator: '==', value: '' };
    }

    if (node.type === 'predicateNode') {
      const d = node.data as PredicateNodeData;
      return {
        __typename: 'PredicateNode',
        domain: d.domain,
        field: d.field,
        operator: d.operator,
        value: d.value,
      };
    }

    // logicalNode
    const d = node.data as LogicalNodeData;
    const childIds = children.get(id) ?? [];
    const reconstructedChildren = childIds.map(reconstruct);

    if (d.logicalType === 'not') {
      return {
        __typename: 'NotNode',
        child: reconstructedChildren[0] ?? {
          __typename: 'PredicateNode',
          domain: 'task',
          field: 'status',
          operator: '==',
          value: '',
        },
      };
    }

    if (d.logicalType === 'or') {
      return {
        __typename: 'OrNode',
        children: reconstructedChildren,
      };
    }

    return {
      __typename: 'AndNode',
      children: reconstructedChildren,
    };
  }

  return reconstruct(rootId);
}
