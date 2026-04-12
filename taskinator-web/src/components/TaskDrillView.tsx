import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, ChevronRight, Folder, MoreVertical, Plus, Zap, Users2, User, Copy } from 'lucide-react';
import { cn } from '../utils/cn';

interface Task {
  id: string;
  title: string;
  status: string;
  parentTaskId?: string | null;
  version: number;
  team?: { id: string; name: string } | null;
  assignee?: { id: string; username: string } | null;
  triggers?: any[];
}

interface TaskDrillViewProps {
  tasks: Task[];
  focusedTaskId: string | null;
  onFocusTask: (taskId: string | null) => void;
  onOpenDetails: (taskId: string) => void;
  onToggleStatus: (task: Task) => void;
  onCreateSubtask: (parentTaskId?: string) => void;
}

export const TaskDrillView: React.FC<TaskDrillViewProps> = ({
  tasks,
  focusedTaskId,
  onFocusTask,
  onOpenDetails,
  onToggleStatus,
  onCreateSubtask
}) => {
  // Build breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs: Task[] = [];
    let currentId = focusedTaskId;
    while (currentId) {
      const task = tasks.find(t => t.id === currentId);
      if (task) {
        crumbs.unshift(task);
        currentId = task.parentTaskId || null;
      } else {
        break;
      }
    }
    return crumbs;
  }, [tasks, focusedTaskId]);

  // Find visible tasks (children of focused task, or roots if none focused)
  const visibleTasks = useMemo(() => {
    return tasks.filter(t => (t.parentTaskId || null) === focusedTaskId);
  }, [tasks, focusedTaskId]);

  // Check which children have subtasks for the sub-folder icon
  const hasChildren = (taskId: string) => {
    return tasks.some(t => t.parentTaskId === taskId);
  };

  return (
    <div className="flex flex-col h-full z-10 w-full max-w-5xl mx-auto px-10">
      {/* Breadcrumbs Navigation */}
      <div className="flex flex-wrap items-center gap-2 mb-6 text-[13px] font-bold text-muted-foreground/60 w-full">
        <button 
          onClick={() => onFocusTask(null)}
          className={cn(
            "hover:text-primary transition-colors",
            !focusedTaskId && "text-primary"
          )}
        >
          Root Tasks
        </button>
        {breadcrumbs.map(crumb => (
          <React.Fragment key={crumb.id}>
            <ChevronRight size={14} className="opacity-50" />
            <button 
              onClick={() => onFocusTask(crumb.id)}
              className={cn(
                "hover:text-primary transition-colors max-w-[200px] truncate",
                focusedTaskId === crumb.id && "text-primary"
              )}
            >
              {crumb.title}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="flex items-center justify-between mb-8 w-full">
         <div>
            <h3 className="text-2xl font-black">{breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].title : 'All Root Tasks'}</h3>
            <p className="text-sm text-muted-foreground mt-1">{visibleTasks.length} sub-tasks enclosed</p>
         </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-20 custom-scrollbar pr-4 w-full">
        <AnimatePresence mode="popLayout">
          {visibleTasks.map(task => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={task.id}
              className={cn(
                "group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 w-full",
                task.status === 'DONE' 
                  ? "bg-white/[0.01] border-transparent opacity-60" 
                  : "glass hover:border-white/10 border-white/5"
              )}
            >
               <div className="flex items-center gap-4 flex-1 w-0 min-w-0">
                  <button 
                    onClick={() => onToggleStatus(task)}
                    className="p-1 hover:scale-110 transition-transform shrink-0"
                  >
                    {task.status === 'DONE' ? <CheckCircle2 size={24} className="text-primary" /> : <Circle size={24} className="text-muted-foreground/40" />}
                  </button>

                  <div className="flex flex-col flex-1 w-0 min-w-0" onClick={() => onOpenDetails(task.id)}>
                     <div className="flex items-center gap-2">
                       <span className={cn(
                         "text-sm font-bold truncate transition-colors cursor-pointer text-left",
                         task.status === 'DONE' ? "line-through text-muted-foreground/60" : "text-foreground hover:text-primary"
                       )}>
                          {task.title}
                       </span>
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           navigator.clipboard.writeText(task.id);
                         }}
                         className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all text-muted-foreground hover:text-white"
                         title="Copy Task ID"
                       >
                         <Copy size={12} />
                       </button>
                     </div>
                     
                     <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {/* Status Badge */}
                        <div className={cn("px-2 py-0.5 rounded-[6px] text-[10px] font-black uppercase tracking-widest border",
                           task.status === 'DONE' ? "bg-primary/10 text-primary border-primary/20" :
                           task.status === 'BLOCKED' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                           task.status === 'IN_PROGRESS' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                           "bg-white/5 text-muted-foreground border-white/10"
                        )}>
                           {task.status === 'IN_PROGRESS' ? 'In Progress' : task.status}
                        </div>

                        {/* Team Badge */}
                        {task.team && (
                          <div className="px-2 py-0.5 rounded-[6px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold flex items-center gap-1">
                             <Users2 size={10} /> <span className="truncate max-w-[100px]">{task.team.name}</span>
                          </div>
                        )}

                        {/* Assignee Badge */}
                        {task.assignee && (
                          <div className="px-2 py-0.5 rounded-[6px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
                             <User size={10} /> <span className="truncate max-w-[80px]">{task.assignee.username}</span>
                          </div>
                        )}

                        {/* Trigger / Automation Badge */}
                        {(task.triggers?.length ?? 0) > 0 && (
                          <div className="px-2 py-0.5 rounded-[6px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold flex items-center gap-1" title="Active Automations">
                             <Zap size={10} /> {task.triggers!.length} active
                          </div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-2 pl-4 shrink-0">
                  {hasChildren(task.id) && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onFocusTask(task.id); }}
                      className="px-3 py-1.5 rounded-lg bg-primary/5 text-primary text-[11px] font-bold flex items-center gap-1.5 hover:bg-primary hover:text-white transition-all mr-2"
                    >
                      <Folder size={12} />
                      Sub-tasks
                    </button>
                  )}
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); onFocusTask(task.id); }}
                    className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Drill down"
                  >
                     <ChevronRight size={16} />
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); onOpenDetails(task.id); }}
                    className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                     <MoreVertical size={16} />
                  </button>
               </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {visibleTasks.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl w-full">
             <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <CheckCircle2 size={24} className="text-muted-foreground/30" />
             </div>
             <p className="text-sm font-bold text-muted-foreground">No tasks enclosed.</p>
             <button 
               onClick={() => onCreateSubtask(focusedTaskId || undefined)}
               className="mt-6 flex items-center gap-2 text-[12px] font-bold text-primary hover:text-indigo-400 bg-primary/10 px-4 py-2 rounded-lg transition-all"
             >
                <Plus size={14} /> Add new task here
             </button>
          </div>
        )}
      </div>
    </div>
  );
};
