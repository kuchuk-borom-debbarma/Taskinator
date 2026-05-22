import React from 'react';
import { GripVertical, Hexagon } from 'lucide-react';
import type { AutoActionCondition } from '../../../gql/graphql';

interface ConditionStepCardProps {
  condition: AutoActionCondition;
  index: number;
  readOnly?: boolean;
  onEdit?: (index: number) => void;
  onRemove?: (index: number) => void;
}

export const ConditionStepCard: React.FC<ConditionStepCardProps> = ({
  condition,
  index,
  readOnly = false,
  onEdit,
  onRemove,
}) => {
  const label = condition.name || 'Logic Block';
  
  // Basic summary of the condition definition
  const getSummary = (node: any): string => {
    if (!node) return '—';
    if (node.__typename === 'PredicateNode') {
      return `${node.field} ${node.operator} ${node.value}`;
    }
    if (node.__typename === 'AndNode') return 'AND (Group)';
    if (node.__typename === 'OrNode') return 'OR (Group)';
    if (node.__typename === 'NotNode') return 'NOT (Inverse)';
    return 'Complex Logic';
  };

  const summary = getSummary(condition.definition);

  return (
    <div className="surface-card flex items-center gap-3 rounded-[14px] px-4 py-3 border-l-4 border-app-warning/40 bg-app-warning/5">
      {/* Drag handle (visual only) */}
      {!readOnly && (
        <GripVertical size={16} className="shrink-0 cursor-grab text-app-muted/50" />
      )}

      {/* Logic Icon */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-warning text-white"
      >
        <Hexagon size={14} fill="currentColor" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-app-ink">{label}</p>
        <p className="mt-0.5 truncate font-mono text-xs text-app-muted/80">{summary}</p>
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={() => onEdit?.(index)}
            className="rounded-lg border border-app-line bg-white/70 px-2.5 py-1 text-xs font-semibold text-app-muted transition hover:border-app-accent/30 hover:text-app-ink"
          >
            Edit
          </button>
          <button
            onClick={() => onRemove?.(index)}
            className="rounded-lg border border-app-danger/20 bg-app-danger/5 px-2.5 py-1 text-xs font-semibold text-app-danger/70 transition hover:bg-app-danger/10"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};
