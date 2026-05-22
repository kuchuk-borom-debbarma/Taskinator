import React, { memo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { LogicalNodeData } from './types';

const CYCLE: ('and' | 'or' | 'not')[] = ['and', 'or', 'not'];

const LOGICAL_STYLES: Record<string, string> = {
  and: 'bg-app-accent-2-soft text-app-accent-2 border-app-accent-2/20',
  or: 'bg-app-accent-soft text-app-accent border-app-accent/20',
  not: 'bg-app-danger/10 text-app-danger border-app-danger/20',
};

const LOGICAL_LABELS: Record<string, string> = {
  and: 'AND',
  or: 'OR',
  not: 'NOT',
};

export const LogicalNode: React.FC<NodeProps> = memo(({ id, data, selected }) => {
  const { logicalType, onTypeChange, onRemove } = data as LogicalNodeData;

  const handleClick = useCallback(() => {
    if (!onTypeChange) return;
    const next = CYCLE[(CYCLE.indexOf(logicalType) + 1) % CYCLE.length];
    onTypeChange(id, next!);
  }, [id, logicalType, onTypeChange]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.(id);
    },
    [id, onRemove]
  );

  return (
    <div className="group relative flex flex-col items-center">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-app-muted"
      />

      <button
        onClick={handleClick}
        title={onTypeChange ? 'Click to cycle: AND → OR → NOT' : undefined}
        className={`
          inline-flex items-center justify-center rounded-full border px-5 py-2.5
          text-sm font-black tracking-widest shadow-soft transition
          ${LOGICAL_STYLES[logicalType]}
          ${selected ? 'ring-2 ring-offset-2 ring-app-accent/40' : ''}
          ${onTypeChange ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        `}
      >
        {LOGICAL_LABELS[logicalType]}
      </button>

      {onRemove && (
        <button
          onClick={handleRemove}
          className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full border border-app-line bg-white text-[10px] text-app-muted shadow-sm transition hover:text-app-danger group-hover:flex"
          title="Remove"
        >
          ✕
        </button>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-app-muted"
      />
    </div>
  );
});

LogicalNode.displayName = 'LogicalNode';
