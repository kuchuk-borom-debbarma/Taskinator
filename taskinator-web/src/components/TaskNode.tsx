import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, User, Layers } from 'lucide-react';
import { cn } from '../utils/cn';
import { RelationshipPill } from './RelationshipPill';
import type { Task } from '../types';

interface TaskNodeProps {
  task: Task;
  isSelected?: boolean;
  isParent?: boolean;
  linkType?: string;
  onClick: () => void;
  onToggleStatus: (task: Task) => void;
}

/**
 * A specialized node for the Columnar Flow view.
 * Optimized for vertical stacking and selection states.
 */
export const TaskNode = React.memo<TaskNodeProps>(({
  task,
  isSelected = false,
  linkType,
  onClick,
  onToggleStatus
}) => {
  return (
    <motion.div
      layout="position"
      onClick={onClick}
      className={cn(
        "group relative w-full p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
        isSelected 
          ? "bg-primary/10 border-primary/30 shadow-sm" 
          : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
      )}
    >
      {linkType && (
        <div className="flex items-center gap-1.5 mb-1.5 opacity-30">
           <span className="text-[7px] font-bold uppercase tracking-widest text-primary italic">{linkType}</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-3 mb-1.5 px-0.5">
        <h3 className={cn(
          "font-bold text-xs tracking-tight leading-tight transition-colors",
          isSelected ? "text-primary" : "text-foreground/80 group-hover:text-foreground"
        )}>
          {task.title}
        </h3>
        <RelationshipPill label={task.status} size="sm" />
      </div>

      <div className="flex items-center gap-2 opacity-30 group-hover:opacity-50 transition-opacity px-0.5">
        <div className="flex items-center gap-1">
          <User size={10} />
          <span className="text-[9px] font-bold uppercase tracking-tighter truncate max-w-[80px]">
            {task.assignee?.username || 'Unassigned'}
          </span>
        </div>
        <div className="h-0.5 w-0.5 rounded-full bg-white/20" />
        <div className="flex items-center gap-1">
          <Layers size={10} className="text-primary" />
          <span className="text-[9px] font-bold uppercase tracking-tighter">
            {task.links?.length || 0} Links
          </span>
        </div>
      </div>

      {/* Completion Toggle */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onToggleStatus(task);
        }}
        className={cn(
          "absolute top-3 right-3 w-4 h-4 rounded-full border flex items-center justify-center transition-all opacity-0 group-hover:opacity-100",
          task.status === 'DONE' ? "border-primary bg-primary text-white" : "border-white/10 text-muted-foreground/30"
        )}
      >
        {task.status === 'DONE' && <CheckCircle2 size={10} />}
      </button>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />
      )}
    </motion.div>
  );
});
