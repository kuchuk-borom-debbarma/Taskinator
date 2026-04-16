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
import { TaskEdge } from './TaskEdge';
import type { Node, Edge } from '@xyflow/react';
import { getLinkLabelColor } from '../../utils/color';

interface TaskGraphProps {
  neighbourhood: TaskNeighbourhood;
}

const nodeTypes = {
  taskNode: TaskNode,
};

const edgeTypes = {
  taskEdge: TaskEdge,
};

const CENTER = { x: 500, y: 400 };

export const TaskGraph: React.FC<TaskGraphProps> = ({ neighbourhood }) => {
  const { rawNodes, rawEdges } = useMemo(() => {
    // 1. Pre-calculate handle counts for each node to ensure non-overlapping ports
    const handleCounts: Record<string, { incoming: number, outgoing: number }> = {};
    neighbourhood.nodes.concat([{ task: neighbourhood.focusedTask, direction: 'both', depth: 0 }]).forEach(n => {
      handleCounts[n.task.id] = {
        incoming: neighbourhood.edges.filter(e => e.targetTaskId === n.task.id).length,
        outgoing: neighbourhood.edges.filter(e => e.sourceTaskId === n.task.id).length,
      };
    });

    // 2. Map to React Flow Nodes with dynamic counts
    const nodes: Node[] = [
      {
        id: neighbourhood.focusedTask.id,
        type: 'taskNode',
        position: CENTER,
        data: { 
          task: neighbourhood.focusedTask, 
          isFocused: true, 
          direction: 'both',
          incomingCount: handleCounts[neighbourhood.focusedTask.id].incoming,
          outgoingCount: handleCounts[neighbourhood.focusedTask.id].outgoing,
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
          depth: n.depth,
          incomingCount: handleCounts[n.task.id].incoming,
          outgoingCount: handleCounts[n.task.id].outgoing,
        },
        draggable: false,
      }))
    ];

    // 3. Keep track of used handle slots to assign unique IDs to each edge
    const usedSlots: Record<string, { incoming: number, outgoing: number }> = {};

    const edges: Edge[] = neighbourhood.edges.map(edge => {
      const edgeColor = getLinkLabelColor(edge.label);
      
      if (!usedSlots[edge.targetTaskId]) usedSlots[edge.targetTaskId] = { incoming: 0, outgoing: 0 };
      if (!usedSlots[edge.sourceTaskId]) usedSlots[edge.sourceTaskId] = { incoming: 0, outgoing: 0 };

      const targetPort = usedSlots[edge.targetTaskId].incoming++;
      const sourcePort = usedSlots[edge.sourceTaskId].outgoing++;
      
      // Calculate 100% reliable de-collision slots
      const slotIndex = (targetPort + sourcePort) % 3;
      const labelPositions = [0.35, 0.5, 0.65];
      const verticalOffsets = [-18, 0, 18];
      
      // Calculate unique curvature to "fan" the lines
      // We use the port index to push lines away from the center
      const outCount = handleCounts[edge.sourceTaskId].outgoing;
      const curvatureFactor = outCount > 1 
        ? ((sourcePort / (outCount - 1)) - 0.5) * 0.4
        : 0;

      return {
        id: edge.id,
        source: edge.sourceTaskId,
        target: edge.targetTaskId,
        sourceHandle: `out-${sourcePort}`,
        targetHandle: `in-${targetPort}`,
        type: 'taskEdge', 
        data: {
          label: edge.label,
          color: edgeColor,
          labelPosition: labelPositions[slotIndex],
          curvature: 0.5 + curvatureFactor,
          verticalOffset: verticalOffsets[slotIndex],
        },
        style: { stroke: edgeColor, strokeWidth: 2.5 },
        animated: false,
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
        edgeTypes={edgeTypes}
        nodeOrigin={[0.5, 0.5]}
        fitView
        fitViewOptions={{ padding: 0.3 }}
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
