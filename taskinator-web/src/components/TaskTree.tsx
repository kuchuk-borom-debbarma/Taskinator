import React, { useMemo, useState } from 'react';
import type { Task, TaskTrigger } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  Hash, 
  User, 
  Zap,
  MoreVertical,
  GripVertical
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskTreeProps {
  tasks: Task[];
  triggerMap: Record<string, TaskTrigger[]>;
  onToggleStatus: (task: Task) => void;
  onCreateSubtask: (parentId: string) => void;
  onClickTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TreeItem: React.FC<{
  task: Task;
  children?: Task[];
  depth: number;
  onToggleStatus: (task: Task) => void;
  onCreateSubtask: (parentId: string) => void;
  onClickTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  treeMap: Record<string, Task[]>;
  triggerMap: Record<string, TaskTrigger[]>;
}> = ({ 
  task, children, depth, onToggleStatus, onCreateSubtask, onClickTask, onDeleteTask, treeMap, triggerMap
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = children && children.length > 0;
  const taskTriggers = triggerMap[task.id] || [];

  return (
    <div className="flex flex-col">
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "group relative flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer",
          "hover:bg-white/[0.03] border border-transparent hover:border-white/5",
          task.status === 'DONE' && "opacity-50"
        )}
        style={{ marginLeft: `${depth * 28}px` }}
        onClick={() => onClickTask(task)}
      >
        {/* Depth Indicator Line */}
        {depth > 0 && (
          <div 
            className="absolute -left-[14px] top-0 bottom-0 w-[1px] bg-gradient-to-b from-border/50 via-border/20 to-transparent" 
            style={{ left: '-18px' }}
          />
        )}

        {/* Drag Handle (Visual only for now) */}
        <div className="opacity-0 group-hover:opacity-20 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical size={14} className="text-muted-foreground" />
        </div>

        {/* Expansion / Icon Area */}
        <div className="flex items-center justify-center w-5 h-5 shrink-0">
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-white/5 transition-colors"
            >
              <motion.div animate={{ rotate: isExpanded ? 0 : -90 }}>
                <ChevronDown size={14} />
              </motion.div>
            </button>
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-border/40" />
          )}
        </div>

        {/* Status Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStatus(task); }}
          className={cn(
            "shrink-0 transition-all duration-300 transform active:scale-75",
            task.status === 'DONE' ? "text-primary" : "text-muted-foreground/60 hover:text-primary"
          )}
        >
          {task.status === 'DONE' ? (
            <CheckCircle2 size={19} className="drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]" />
          ) : (
            <Circle size={19} />
          )}
        </button>

        {/* Task Title & Details */}
        <div className="flex flex-1 items-center gap-4 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className={cn(
              "text-[13px] font-medium truncate transition-all",
              task.status === 'DONE' && "line-through text-muted-foreground translate-x-1"
            )}>
              {task.title}
            </span>
            
            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground/40 font-medium">
               {task.team && (
                 <div className="flex items-center gap-1">
                   <Hash size={10} className="text-blue-500/50" />
                   <span>{task.team.name}</span>
                 </div>
               )}
               {task.assignee && (
                 <div className="flex items-center gap-1">
                   <User size={10} className="text-emerald-500/50" />
                   <span>{task.assignee.username}</span>
                 </div>
               )}
            </div>
          </div>

          {/* Trigger Badge */}
          {taskTriggers.length > 0 && (
            <div className="flex items-center gap-1 bg-amber-500/5 border border-amber-500/20 px-1.5 py-0.5 rounded-full shrink-0">
              <Zap size={10} className="text-amber-500 fill-amber-500/20" />
              <span className="text-[9px] font-bold text-amber-500/80">{taskTriggers.length}</span>
            </div>
          )}
        </div>

        {/* Metadata & Actions (Hover) */}
        <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 shrink-0 bg-background/80 backdrop-blur-md rounded-lg p-0.5 border border-white/5 shadow-2xl">
          <button
            onClick={(e) => { e.stopPropagation(); onCreateSubtask(task.id); }}
            className="p-1.5 hover:bg-white/5 rounded-md text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
            className="p-1.5 hover:bg-red-500/10 rounded-md text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <div className="w-[1px] h-3 bg-border/40 mx-1" />
          <button className="p-1.5 hover:bg-white/5 rounded-md text-muted-foreground hover:text-foreground">
            <MoreVertical size={14} />
          </button>
        </div>
      </motion.div>

      {/* Children Sub-tree with Animation */}
      <AnimatePresence initial={false}>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="overflow-hidden"
          >
            {children.map(child => (
              <TreeItem
                key={child.id}
                task={child}
                children={treeMap[child.id]}
                depth={depth + 1}
                onToggleStatus={onToggleStatus}
                onCreateSubtask={onCreateSubtask}
                onClickTask={onClickTask}
                onDeleteTask={onDeleteTask}
                treeMap={treeMap}
                triggerMap={triggerMap}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const TaskTree: React.FC<TaskTreeProps> = ({
  tasks, triggerMap, onToggleStatus, onCreateSubtask, onClickTask, onDeleteTask
}) => {
  const rootTasks = useMemo(() => {
    const treeMap: Record<string, Task[]> = {};
    const roots: Task[] = [];
    tasks.forEach(task => {
      if (task.parentTaskId) {
        if (!treeMap[task.parentTaskId]) treeMap[task.parentTaskId] = [];
        treeMap[task.parentTaskId].push(task);
      } else {
        roots.push(task);
      }
    });
    return { roots, treeMap };
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
          <Hash size={24} className="opacity-20" />
        </div>
        <p className="text-sm font-medium">No tasks found in Nebula</p>
        <p className="text-[11px] opacity-40 mt-1">Start by creating your first task above.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 w-full h-full overflow-y-auto custom-scrollbar">
      <div className="flex flex-col gap-1 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="popLayout">
          {rootTasks.roots.map(task => (
            <TreeItem
              key={task.id}
              task={task}
              children={rootTasks.treeMap[task.id]}
              depth={0}
              onToggleStatus={onToggleStatus}
              onCreateSubtask={onCreateSubtask}
              onClickTask={onClickTask}
              onDeleteTask={onDeleteTask}
              treeMap={rootTasks.treeMap}
              triggerMap={triggerMap}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
