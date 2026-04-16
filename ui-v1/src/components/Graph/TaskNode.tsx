import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Link } from '@tanstack/react-router';
import type { ProjectTask } from '../../api/types';

export type TaskNodeData = {
  task: ProjectTask;
  isFocused: boolean;
  direction: 'incoming' | 'outgoing' | 'both';
};

export const TaskNode: React.FC<NodeProps> = memo(({ data }: any) => {
  const { task, isFocused, direction } = data as TaskNodeData;
  
  const statusColors: Record<string, string> = {
    TODO: 'bg-todo',
    IN_PROGRESS: 'bg-incoming',
    DONE: 'bg-done',
  };

  const ringColor = isFocused 
    ? 'ring-focus-blue' 
    : direction === 'incoming' 
      ? 'ring-incoming' 
      : 'ring-outgoing';

  return (
    <div className="relative group">
      {/* Handles for edges (invisible) */}
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />

      <Link 
        to="/projects/$projectId/tasks/$taskId" 
        params={{ projectId: task.projectId, taskId: task.id }}
        className={`
          flex flex-col items-center gap-2 p-1 transition-all duration-300
          ${isFocused ? 'scale-110' : 'hover:scale-105'}
        `}
      >
        {/* The Node dot */}
        <div className={`
          w-4 h-4 rounded-full border-2 border-white shadow-sm ring-4 ring-opacity-20
          ${statusColors[task.status] || 'bg-gray-400'}
          ${ringColor}
          ${isFocused ? 'ring-opacity-40' : 'group-hover:ring-opacity-40'}
        `} />

        {/* The Label */}
        <div className={`
          px-2.5 py-1 rounded-lg border border-border-notion bg-white/80 backdrop-blur-sm shadow-sm
          max-w-[150px] transition-all duration-200
          ${isFocused ? 'border-focus-blue shadow-md' : 'group-hover:border-text-dim'}
        `}>
          <p className={`
            text-[11px] truncate leading-tight transition-colors
            ${isFocused ? 'font-bold text-text-notion' : 'font-medium text-text-notion/80 group-hover:text-text-notion'}
          `}>
            {task.title}
          </p>
        </div>
      </Link>
    </div>
  );
});
