import React, { memo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { PredicateNodeData } from './types';

export const PredicateNode: React.FC<NodeProps> = memo(({ id, data, selected }) => {
  const { domain, field, operator, value, onSelect } = data as PredicateNodeData;

  const handleClick = useCallback(() => {
    onSelect?.(id);
  }, [id, onSelect]);

  return (
    <div
      onClick={handleClick}
      className={`
        surface-card cursor-pointer rounded-[14px] px-4 py-3 min-w-[180px] transition
        ${selected ? 'ring-2 ring-app-accent ring-offset-2' : 'hover:shadow-float'}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-app-muted"
      />

      {/* Domain badge */}
      <div className="mb-2">
        <span className="rounded-full bg-app-ink/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-app-muted">
          {domain}
        </span>
      </div>

      {/* Condition expression */}
      <p className="font-mono text-xs text-app-ink">
        <span className="font-semibold text-app-accent-2">{field}</span>
        <span className="mx-1.5 text-app-muted">{operator}</span>
        <span className="font-semibold text-app-ink">
          {String(value) || <span className="italic text-app-muted">empty</span>}
        </span>
      </p>
    </div>
  );
});

PredicateNode.displayName = 'PredicateNode';
