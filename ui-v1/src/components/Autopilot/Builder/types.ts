import type { Node } from '@xyflow/react';

// ─── Node Data Types ──────────────────────────────────────────────────────────

export interface LogicalNodeData extends Record<string, unknown> {
  logicalType: 'and' | 'or' | 'not';
  onTypeChange?: (id: string, next: 'and' | 'or' | 'not') => void;
  onRemove?: (id: string) => void;
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
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not equals' },
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'exists', label: 'Exists' },
  { value: 'empty', label: 'Empty' },
  { value: 'changed', label: 'Changed' },
  { value: 'changedTo', label: 'Changed to' },
  { value: 'changedFrom', label: 'Changed from' },
];

export const TASK_STATUS_OPTIONS = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
];

export const TASK_PRIORITY_OPTIONS = [
  { value: '0', label: 'Urgent' },
  { value: '1', label: 'High' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'Low' },
];
