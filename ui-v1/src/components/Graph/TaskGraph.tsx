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

export const TaskGraph: React.FC<TaskGraphProps> = ({ neighbourhood }) => {
  const center = { x: 500, y: 400 };

  const { rawNodes, rawEdges } = useMemo(() => {
    // 1. Initial Map to React Flow Nodes (without final positions)
    const nodes: Node[] = [
      // Central Focused Node
      {
        id: neighbourhood.focusedTask.id,
        type: 'taskNode',
        position: center,
        data: { 
          task: neighbourhood.focusedTask, 
          isFocused: true, 
          direction: 'both' 
        },
        draggable: false,
      },
      // Neighbour Nodes (initially at center, force will move them)
      ...neighbourhood.nodes.map(n => ({
        id: n.task.id,
        type: 'taskNode',
        position: center,
        data: { 
          task: n.task, 
          isFocused: false, 
          direction: n.direction 
        },
        draggable: false,
      }))
    ];

    // 2. Map to React Flow Edges
    const edges: Edge[] = neighbourhood.edges.map(edge => ({
      id: edge.id,
      source: edge.sourceTaskId,
      target: edge.targetTaskId,
      label: edge.label,
      type: 'smoothstep',
      labelStyle: { fill: '#37352f', fontSize: 11, fontWeight: 700 },
      labelBgStyle: { fill: '#f7f6f3', fillOpacity: 1, rx: 6, ry: 6 },
      labelBgPadding: [6, 3] as [number, number],
      style: { stroke: 'rgba(55, 53, 47, 0.45)', strokeWidth: 2.5 },
      animated: true,
    }));

    return { rawNodes: nodes, rawEdges: edges };
  }, [neighbourhood, center]);

  // 3. Apply Force Layout
  const { nodes: rfNodes, edges: rfEdges } = useTaskGraphLayout(rawNodes, rawEdges, center);

  return (
    <div className="w-full aspect-[5/4] sm:aspect-[16/9] bg-bg-secondary relative">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={4}
        
        // Trackpad / Excalidraw-like interactions
        panOnScroll={true}
        zoomOnScroll={false}
        zoomOnPinch={true}
        panOnDrag={false} // Prevents accidental dragging with one finger
        
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        className="bg-bg-secondary"
      >
        <Background gap={20} size={1} color="#e9e9e8" />
        <Controls 
          showInteractive={false} 
          className="bg-white border border-border-notion shadow-md rounded-md"
        />
        
        <div className="absolute bottom-4 left-4 pointer-events-none">
          <div className="bg-white/80 backdrop-blur border border-border-notion px-2.5 py-1 rounded-md text-[9px] font-bold uppercase text-text-dim tracking-wider">
            Link Discovery Engine v1
          </div>
        </div>
      </ReactFlow>

      <style>{`
        .react-flow__handle {
          background: transparent !important;
          border: none !important;
        }
        .react-flow__controls-button {
          border-bottom: 1px solid var(--color-border-notion) !important;
          fill: var(--color-text-dim) !important;
        }
      `}</style>
    </div>
  );
};
