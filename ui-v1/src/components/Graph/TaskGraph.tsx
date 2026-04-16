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

// Deterministic color generator based on link label
const getLinkLabelColor = (label: string = '') => {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Use HSL for consistent vibrance and legible text
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 45%)`;
};

export const TaskGraph: React.FC<TaskGraphProps> = ({ neighbourhood }) => {
  const { rawNodes, rawEdges } = useMemo(() => {
    // 1. Initial Map to React Flow Nodes
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
        draggable: false,
      },
      ...neighbourhood.nodes.map(n => ({
        id: n.task.id,
        type: 'taskNode',
        position: CENTER,
        data: { 
          task: n.task, 
          isFocused: false, 
          direction: n.direction,
          depth: n.depth
        },
        draggable: false,
      }))
    ];

    // 2. Map to React Flow Edges with Color Hashing and Step style
    const edges: Edge[] = neighbourhood.edges.map(edge => {
      const edgeColor = getLinkLabelColor(edge.label);
      
      return {
        id: edge.id,
        source: edge.sourceTaskId,
        target: edge.targetTaskId,
        label: edge.label,
        type: 'step', // Orthogonal tournament-style links
        labelStyle: { fill: '#ffffff', fontSize: 11, fontWeight: 700 }, 
        labelBgStyle: { fill: edgeColor, fillOpacity: 1, rx: 6, ry: 6 },
        labelBgPadding: [6, 3] as [number, number],
        style: { stroke: edgeColor, strokeWidth: 2.5 },
        animated: true,
      };
    });

    return { rawNodes: nodes, rawEdges: edges };
  }, [neighbourhood]);

  // 3. Apply Deterministic Tournament Layout
  const { nodes: rfNodes, edges: rfEdges } = useTaskGraphLayout(rawNodes, rawEdges, CENTER);

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
