import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, User, Layers, Share2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { RelationshipPill } from './RelationshipPill';
import type { Task } from '../types';

interface TaskNodeProps {
  task: Task;
  isSelected?: boolean;
  linkType?: string;
  onClick: () => void;
  onToggleStatus: (task: Task) => void;
  onUpdateTitle?: (id: string, title: string) => void;
}

/**
 * A versatile task node for both List and Column views.
 * Supports inline editing and rich connectivity metadata.
 */
export const TaskNode = React.memo<TaskNodeProps>(({
  task,
  isSelected = false,
  linkType,
  onClick,
  onToggleStatus,
  onUpdateTitle
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState(task.title);

  React.useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  const handleBlur = () => {
    setIsEditing(false);
    if (title !== task.title) {
        onUpdateTitle?.(task.id, title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.currentTarget.blur();
    }
  };

  return (
    <motion.div
      layout="position"
      onClick={onClick}
      className={cn(
        "group relative w-full p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none",
        isSelected 
          ? "bg-primary/10 border-primary/40 shadow-xl shadow-primary/10" 
          : "bg-white/[0.01] border-white/5 hover:border-white/20 hover:bg-white/[0.03]"
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0" onClick={(e) => isEditing && e.stopPropagation()}>
            {isEditing ? (
                <input 
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent border-none outline-none font-bold text-sm tracking-tight text-foreground p-0"
                />
            ) : (
                <h3 
                    onDoubleClick={() => setIsEditing(true)}
                    className={cn(
                        "font-bold text-sm tracking-tight leading-tight transition-colors truncate",
                        isSelected ? "text-primary" : "text-foreground/90 group-hover:text-foreground"
                    )}
                >
                    {task.title}
                </h3>
            )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
            <RelationshipPill label={task.status} size="sm" />
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleStatus(task);
                }}
                className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                    task.status === 'DONE' ? "border-primary bg-primary text-white" : "border-white/10 text-muted-foreground/30 hover:border-white/30"
                )}
            >
                {task.status === 'DONE' && <CheckCircle2 size={12} />}
            </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 opacity-40 group-hover:opacity-60 transition-opacity">
            <div className="flex items-center gap-1.5">
                <User size={11} className={isSelected ? "text-primary" : ""} />
                <span className="text-[10px] font-bold uppercase tracking-tighter truncate max-w-[100px]">
                    {task.assignee?.username || 'Unassigned Signal'}
                </span>
            </div>
            <div className="h-2 w-[1px] bg-white/10" />
            <div className="flex items-center gap-1.5">
                <Layers size={11} className="text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">
                    {task.links?.length || 0} Synapses
                </span>
            </div>
        </div>
        
        {linkType && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/20">
                <Share2 size={8} className="text-primary" />
                <span className="text-[8px] font-black uppercase tracking-widest text-primary italic">{linkType}</span>
            </div>
        )}
      </div>

      {isSelected && (
        <motion.div 
            layoutId="selection-border"
            className="absolute -inset-[1px] rounded-2xl border-2 border-primary pointer-events-none" 
            initial={false}
        />
      )}
    </motion.div>
  );
});
