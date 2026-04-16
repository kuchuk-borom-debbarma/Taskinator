import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, User, ArrowRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { RelationshipPill } from './RelationshipPill';
import type { Task } from '../types';

interface LatticeNodeProps {
  task: Task;
  isSelected?: boolean;
  isParent?: boolean;
  linkType?: string;
  onClick: () => void;
  onToggleStatus: (task: Task) => void;
}

/**
 * A specialized node for the Columnar Lattice view.
 * Optimized for vertical stacking and selection states.
 */
export const LatticeNode: React.FC<LatticeNodeProps> = ({
  task,
  isSelected = false,
  isParent = false,
  linkType,
  onClick,
  onToggleStatus
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02, x: 4 }}
      onClick={onClick}
      className={cn(
        "group relative w-full p-4 rounded-2xl border transition-all cursor-pointer select-none",
        isSelected 
          ? "glass-card bg-primary/10 border-primary/40 shadow-lg shadow-primary/10" 
          : isParent
            ? "bg-white/[0.02] border-white/10 opacity-60"
            : "bg-white/[0.01] border-white/5 hover:border-white/20"
      )}
    >
      {linkType && (
        <div className="flex items-center gap-1.5 mb-2 opacity-40">
           <div className="h-px w-3 bg-primary" />
           <span className="text-[8px] font-black uppercase tracking-widest text-primary italic">{linkType}</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className={cn(
          "font-bold text-sm tracking-tight leading-tight transition-colors",
          isSelected ? "text-primary" : "text-foreground/90 group-hover:text-foreground"
        )}>
          {task.title}
        </h3>
        <RelationshipPill label={task.status} size="sm" />
      </div>

      <div className="flex items-center gap-3 opacity-40 group-hover:opacity-70 transition-opacity">
        <div className="flex items-center gap-1">
          <User size={10} />
          <span className="text-[9px] font-black uppercase tracking-tighter truncate max-w-[80px]">
            {task.assignee?.username || 'Unassigned'}
          </span>
        </div>
        <div className="h-1 w-1 rounded-full bg-white/20" />
        <div className="flex items-center gap-1">
          <ArrowRight size={10} className="text-primary" />
          <span className="text-[9px] font-black uppercase tracking-tighter">
            {task.links?.length || 0} Synapses
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
          "absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full border bg-background flex items-center justify-center transition-all hover:scale-110 shadow-md",
          task.status === 'DONE' ? "border-primary text-primary" : "border-white/10 text-muted-foreground"
        )}
      >
        {task.status === 'DONE' ? <CheckCircle2 size={12} /> : <Circle size={12} />}
      </button>

      {/* Selection Indicator */}
      {isSelected && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
        />
      )}
    </motion.div>
  );
};
