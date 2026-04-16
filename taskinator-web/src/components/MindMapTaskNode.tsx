import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, User, Users2, Target } from 'lucide-react';
import { cn } from '../utils/cn';
import { RelationshipPill } from './RelationshipPill';
import type { Task } from '../types';

interface MindMapTaskNodeProps {
  task: Task;
  isFocus?: boolean;
  onFocus: (taskId: string) => void;
  onToggleStatus: (task: Task) => void;
  style?: React.CSSProperties;
  dragConstraints?: React.RefObject<HTMLDivElement>;
  onDrag?: (taskId: string, point: { x: number, y: number }) => void;
}

/**
 * A specialized task node for the Mind-Map (Neural Lattice) view.
 * Designed to be draggable, compact, and high-density.
 */
export const MindMapTaskNode: React.FC<MindMapTaskNodeProps> = ({
  task,
  isFocus = false,
  onFocus,
  onToggleStatus,
  style,
  dragConstraints,
  onDrag
}) => {
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.05}
      dragConstraints={dragConstraints}
      onDrag={(_, info) => onDrag?.(task.id, info.point)}
      onDragStart={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (isFocus) return;
        onFocus(task.id);
      }}
      style={style}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: isFocus ? 1.05 : 1,
        zIndex: isFocus ? 50 : 10
      }}
      whileHover={{ scale: isFocus ? 1.08 : 1.05 }}
      whileDrag={{ scale: 1.1, cursor: 'grabbing', zIndex: 100 }}
      className={cn(
        "absolute glass-card select-none cursor-grab active:cursor-grabbing transition-shadow",
        isFocus 
          ? "w-[300px] p-6 rounded-[2.5rem] border-primary/40 shadow-2xl shadow-primary/20 bg-primary/5" 
          : "w-[220px] p-4 rounded-3xl border-white/5 shadow-xl hover:border-white/20"
      )}
    >
      {/* Node status / pill */}
      <div className="flex items-center justify-between mb-3 truncate">
         <RelationshipPill label={task.status} size="sm" />
         {isFocus && (
            <div className="text-[8px] font-black uppercase tracking-widest text-primary/60 italic">Central Anchor</div>
         )}
      </div>

      {/* Title */}
      <h3 className={cn(
        "font-black tracking-tight mb-2 truncate group-hover:text-primary transition-colors italic",
        isFocus ? "text-xl" : "text-sm"
      )}>
        {task.title}
      </h3>

      {/* Meta info shown mostly on focus */}
      {isFocus && (
        <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3 mt-4 pt-4 border-t border-white/5"
        >
            <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <User size={12} />
                </div>
                <span className="text-[10px] font-bold opacity-60 truncate">{task.assignee?.username || 'Unassigned Signal'}</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Users2 size={12} />
                </div>
                <span className="text-[10px] font-bold opacity-60 truncate">{task.team?.name || 'Core Domain'}</span>
            </div>
        </motion.div>
      )}

      {/* Compact footer for normal nodes */}
      {!isFocus && (
        <div className="flex items-center gap-2 mt-2 opacity-40">
           <div className="h-[2px] w-4 bg-white/20 rounded-full" />
           <span className="text-[8px] font-black uppercase tracking-tighter">{task.links?.length || 0} Synapses</span>
        </div>
      )}

      {/* Toggle Action */}
      <button 
        onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(task);
        }}
        className={cn(
            "absolute -bottom-2 -right-2 w-8 h-8 rounded-full border bg-background flex items-center justify-center transition-all hover:scale-110 shadow-lg",
            task.status === 'DONE' ? "border-primary text-primary" : "border-white/5 text-muted-foreground"
        )}
      >
        {task.status === 'DONE' ? <CheckCircle2 size={14} /> : <Circle size={14} />}
      </button>

      {/* Dock Points (Visual markers for SVG starts) */}
      <div className="absolute top-1/2 -left-1 w-2 h-2 rounded-full bg-primary/20 border border-primary/40 -translate-y-1/2 opacity-0 group-hover:opacity-100" />
      <div className="absolute top-1/2 -right-1 w-2 h-2 rounded-full bg-primary/20 border border-primary/40 -translate-y-1/2 opacity-0 group-hover:opacity-100" />
    </motion.div>
  );
};
