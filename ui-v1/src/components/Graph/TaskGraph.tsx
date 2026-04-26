import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { TaskNeighbourhood } from '../../api/types';
import { useTaskGraphLayout } from '../../hooks/useTaskGraphLayout';
import { TaskNode } from './TaskNode';
import type { Node, Edge } from '@xyflow/react';

interface TaskGraphProps {
  neighbourhood: TaskNeighbourhood;
}

const nodeTypes = {
  taskNode: TaskNode,
};

const CENTER = { x: 500, y: 400 };

const getLinkLabelColor = (label: string = '') => {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 45%)`;
};

export const TaskGraph: React.FC<TaskGraphProps> = ({ neighbourhood }) => {
  const { rawNodes, rawEdges } = useMemo(() => {
    const nodes: Node[] = [
      {
        id: neighbourhood.focusedTask.id,
        type: 'taskNode',
        position: CENTER,
        data: { 
          task: neighbourhood.focusedTask, 
          isFocused: true, 
          direction: 'both' 
        },
        draggable: true,
      },
      ...neighbourhood.nodes.map(n => ({
        id: n.task.id,
        type: 'taskNode',
        position: CENTER,
        data: { 
          task: n.task, 
          isFocused: false, 
          direction: n.direction,
          depth: n.depth || 1
        },
        draggable: true,
      }))
    ];

    const edges: Edge[] = neighbourhood.edges.map(edge => {
      const edgeColor = getLinkLabelColor(edge.label);
      
      return {
        id: edge.id,
        source: edge.sourceTaskId,
        target: edge.targetTaskId,
        label: edge.label,
        type: 'smoothstep',
        labelStyle: { fill: '#ffffff', fontSize: 10, fontWeight: 800 }, 
        labelBgStyle: { fill: edgeColor, fillOpacity: 0.9, rx: 4, ry: 4 },
        labelBgPadding: [4, 2] as [number, number],
        style: { stroke: edgeColor, strokeWidth: 2, opacity: 0.6 },
        animated: true,
      };
    });

    return { rawNodes: nodes, rawEdges: edges };
  }, [neighbourhood]);

  const { nodes: rfNodes, edges: rfEdges } = useTaskGraphLayout(rawNodes, rawEdges, CENTER);

  return (
    <div className="w-full h-full bg-[#0B0F1A] relative">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        colorMode="dark"
      >
        <Background gap={20} size={1} color="#1e293b" />
        <Controls className="bg-slate-900 border-slate-800" />
      </ReactFlow>
    </div>
  );
};
