import React from 'react';
import { GripVertical } from 'lucide-react';
import type { AutopilotAction } from '../../../api/interfaces/AutopilotAPI';
import { getActionDefinition, summariseConfig, normalizeAction } from './actionTypes';

interface ActionStepCardProps {
  action: AutopilotAction;
  index: number;
  readOnly?: boolean;
  onEdit?: (index: number) => void;
  onRemove?: (index: number) => void;
}

const POSITION_COLORS = [
  'bg-app-accent text-white',
  'bg-app-accent-2 text-white',
  'bg-app-success text-white',
  'bg-app-neutral/80 text-white',
];

export const ActionStepCard: React.FC<ActionStepCardProps> = ({
  action,
  index,
  readOnly = false,
  onEdit,
  onRemove,
}) => {
  const normalized = normalizeAction(action);
  const definition = getActionDefinition(normalized.type);
  const label = definition?.label ?? normalized.type;
  const configSummary = summariseConfig(normalized.config);
  const positionColor = POSITION_COLORS[index % POSITION_COLORS.length] ?? POSITION_COLORS[0];


  return (
    <div className="surface-card flex items-center gap-3 rounded-[14px] px-4 py-3 border-l-4 border-app-accent/30">
      {/* Drag handle (visual only) */}
      {!readOnly && (
        <GripVertical size={16} className="shrink-0 cursor-grab text-app-muted/50" />
      )}

      {/* Position badge */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${positionColor}`}
      >
        {action.position}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-app-ink">{label}</p>
        {configSummary !== '—' && (
          <p className="mt-0.5 truncate font-mono text-xs text-app-muted">{configSummary}</p>
        )}
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
