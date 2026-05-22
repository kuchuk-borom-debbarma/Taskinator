import { describe, it, expect } from 'vitest';
import { conditionTreeToGraph } from './treeSerializer';
import { graphToConditionTree } from './treeDeserializer';
import type { ConditionNode } from '../../../gql/graphql';

describe('AutoAction Tree Serializers (GQL Union)', () => {
  const mockTree: ConditionNode = {
    __typename: 'AndNode',
    children: [
      {
        __typename: 'PredicateNode',
        domain: 'task',
        field: 'status',
        operator: '==',
        value: 'DONE',
      },
      {
        __typename: 'OrNode',
        children: [
          {
            __typename: 'PredicateNode',
            domain: 'project',
            field: 'name',
            operator: 'contains',
            value: 'Urgent',
          },
          {
            __typename: 'NotNode',
            child: {
              __typename: 'PredicateNode',
              domain: 'task',
              field: 'priority',
              operator: '>',
              value: '5',
            },
          },
        ],
      },
    ],
  };

  it('should convert GQL tree to graph and back', () => {
    const { nodes, edges, rootId } = conditionTreeToGraph(mockTree as any);
    
    // Check nodes count: And(1) + Pred(1) + Or(1) + Pred(1) + Not(1) + Pred(1) = 6 nodes
    expect(nodes.length).toBe(6);
    expect(edges.length).toBe(5);

    const reconstructed = graphToConditionTree(nodes, edges, rootId);
    expect(reconstructed).toEqual(mockTree);
  });
});
