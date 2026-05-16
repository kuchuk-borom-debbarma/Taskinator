import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { AutopilotConditionNode } from '../../../api/interfaces/AutopilotAPI';
import { conditionTreeToGraph } from './treeSerializer';
import { graphToConditionTree } from './treeDeserializer';
import { LogicalNode } from './LogicalNode';
import { PredicateNode } from './PredicateNode';
import { PredicateEditorPanel } from './PredicateEditorPanel';
import type { LogicalNodeData, PredicateNodeData } from './types';
import { Plus } from 'lucide-react';

// ─── Node type registry ───────────────────────────────────────────────────────

const nodeTypes = {
  logicalNode: LogicalNode,
  predicateNode: PredicateNode,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConditionBuilderCanvasProps {
  initialCondition: AutopilotConditionNode;
  onChange?: (condition: AutopilotConditionNode) => void;
  readOnly?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ConditionBuilderCanvas: React.FC<ConditionBuilderCanvasProps> = ({
  initialCondition,
  onChange,
  readOnly = false,
}) => {
  const { nodes: initNodes, edges: initEdges, rootId } = useMemo(
    () => conditionTreeToGraph(initialCondition),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  const [selectedPredicateId, setSelectedPredicateId] = useState<string | null>(null);
  const [rootIdVal] = useState(rootId);

  // ── Propagation ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (readOnly || !onChange) return;
    try {
      const tree = graphToConditionTree(nodes, edges, rootIdVal);
      onChange(tree);
    } catch (err) {
      console.warn('ConditionBuilderCanvas: Failed to reconstruct tree', err);
    }
  }, [nodes, edges, rootIdVal, onChange, readOnly]);


  // ── Callbacks injected into node data ──────────────────────────────────────

  const handlePredicateSelect = useCallback((id: string) => {
    if (readOnly) return;
    setSelectedPredicateId((prev) => (prev === id ? null : id));
  }, [readOnly]);

  const handleLogicalTypeChange = useCallback(
    (id: string, next: 'and' | 'or' | 'not') => {
      if (readOnly) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...(n.data as LogicalNodeData), logicalType: next } }
            : n,
        ),
      );
    },
    [readOnly, setNodes],
  );

  const handleLogicalRemove = useCallback(
    (nodeId: string) => {
      if (readOnly) return;
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [readOnly, setNodes, setEdges],
  );

  // Inject live callbacks into node data on every render
  const nodesWithCallbacks: Node[] = useMemo(
    () =>
      nodes.map((n) => {
        if (n.type === 'logicalNode') {
          return {
            ...n,
            data: { 
              ...(n.data as LogicalNodeData), 
              onTypeChange: readOnly ? undefined : handleLogicalTypeChange,
              onRemove: readOnly ? undefined : handleLogicalRemove,
            },
          };
        }
        if (n.type === 'predicateNode') {
          return {
            ...n,
            data: {
              ...(n.data as PredicateNodeData),
              onSelect: readOnly ? undefined : handlePredicateSelect,
              isSelected: n.id === selectedPredicateId,
            },
            selected: n.id === selectedPredicateId,
          };
        }
        return n;
      }),
    [nodes, selectedPredicateId, handleLogicalTypeChange, handlePredicateSelect, readOnly],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds));
    },
    [readOnly, setEdges],
  );

  // ── Panel update/remove handlers ───────────────────────────────────────────

  const handlePredicateUpdate = useCallback(
    (nodeId: string, data: Partial<PredicateNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...(n.data as PredicateNodeData), ...data } } : n,
        ),
      );
    },
    [setNodes],
  );

  const handlePredicateRemove = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedPredicateId(null);
    },
    [setNodes, setEdges],
  );

  // ── Add node helpers ───────────────────────────────────────────────────────

  const addLogicalNode = useCallback(
    (type: 'and' | 'or' | 'not') => {
      const id = `node-new-${Date.now()}`;
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: 'logicalNode',
          position: { x: 80, y: (nds.length) * 130 },
          data: { logicalType: type } satisfies LogicalNodeData,
        },
      ]);
    },
    [setNodes],
  );

  const addPredicateNode = useCallback(() => {
    const id = `node-new-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'predicateNode',
        position: { x: 350, y: (nds.length) * 130 },
        data: {
          domain: 'task',
          field: 'status',
          operator: '==',
          value: 'TODO',
        } satisfies PredicateNodeData,
      },
    ]);
  }, [setNodes]);

  // ── Selected predicate data ────────────────────────────────────────────────

  const selectedNode = selectedPredicateId
    ? nodes.find((n) => n.id === selectedPredicateId)
    : null;

  return (
    <ReactFlowProvider>
      <div className="absolute inset-0 rounded-[16px] overflow-hidden border border-app-line/60 bg-white/40 backdrop-blur-sm">
        {/* Toolbar */}
        {!readOnly && (
          <div className="absolute left-3 top-3 z-10 flex gap-2">
            <button
              onClick={() => addLogicalNode('and')}
              className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-app-ink shadow-sm transition hover:bg-white"
            >
              <Plus size={11} /> AND
            </button>
            <button
              onClick={() => addLogicalNode('or')}
              className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-app-ink shadow-sm transition hover:bg-white"
            >
              <Plus size={11} /> OR
            </button>
            <button
              onClick={() => addLogicalNode('not')}
              className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-app-ink shadow-sm transition hover:bg-white"
            >
              <Plus size={11} /> NOT
            </button>
            <button
              onClick={addPredicateNode}
              className="inline-flex items-center gap-1.5 rounded-full border border-app-accent/30 bg-app-accent-soft px-3 py-1.5 text-xs font-semibold text-app-accent shadow-sm transition hover:bg-app-accent/15"
            >
              <Plus size={11} /> Predicate
            </button>
          </div>
        )}

        {/* Predicate editor panel */}
        {selectedPredicateId && selectedNode && (
          <PredicateEditorPanel
            nodeId={selectedPredicateId}
            data={selectedNode.data as PredicateNodeData}
            onUpdate={handlePredicateUpdate}
            onRemove={handlePredicateRemove}
            onClose={() => setSelectedPredicateId(null)}
          />
        )}

        {/* Canvas */}
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          panOnDrag
          zoomOnScroll
          minZoom={0.3}
          maxZoom={2}
        >
          <Background
            gap={24}
            size={1}
            color="rgba(24, 33, 47, 0.06)"
          />
          <Controls
            showInteractive={false}
            className="!bottom-3 !left-3 !top-auto !rounded-2xl !border-app-line !bg-white/90 !shadow-soft"
          />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
};
