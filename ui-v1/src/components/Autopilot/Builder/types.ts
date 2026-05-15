import type { Node, Edge } from '@xyflow/react';

// ─── Node Data Types ──────────────────────────────────────────────────────────

export interface LogicalNodeData extends Record<string, unknown> {
  logicalType: 'and' | 'or' | 'not';
  onTypeChange?: (id: string, next: 'and' | 'or' | 'not') => void;
}

export interface PredicateNodeData extends Record<string, unknown> {
  domain: string;
  field: string;
  operator: string;
  value: string;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

export type ConditionBuilderNodeType = 'logicalNode' | 'predicateNode';

export type ConditionBuilderNode = Node<LogicalNodeData | PredicateNodeData, ConditionBuilderNodeType>;

// ─── Domain field definitions ─────────────────────────────────────────────────

export const DOMAIN_FIELDS: Record<string, { label: string; value: string }[]> = {
  task: [
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'title', label: 'Title' },
  ],
  project: [
    { value: 'name', label: 'Name' },
  ],
};

export const OPERATORS = [
  { value: '==', label: 'Equals (==)' },
  { value: '!=', label: 'Not equals (!=)' },
  { value: '>', label: 'Greater than (>)' },
  { value: '<', label: 'Less than (<)' },
  { value: 'contains', label: 'Contains' },
];

export const TASK_STATUS_OPTIONS = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
];

export const TASK_PRIORITY_OPTIONS = [
  { value: '1', label: '1 — Urgent' },
  { value: '2', label: '2 — High' },
  { value: '3', label: '3 — Medium' },
  { value: '4', label: '4 — Low' },
];
