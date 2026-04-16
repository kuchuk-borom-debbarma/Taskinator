import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Plus, 
  User, 
  ArrowRight,
  Settings2
} from 'lucide-react';
import { TaskNode } from './TaskNode';
import { RelationshipPill } from './RelationshipPill';
import type { Task } from '../types';

interface TaskFlowProps {
  tasks: Task[];
  rootTasks?: Task[];
  onOpenDetails: (taskId: string) => void;
  onToggleStatus: (task: Task) => void;
  onFocusTask: (taskId: string | null) => void;
}

export const TaskFlow: React.FC<TaskFlowProps> = ({
  tasks,
  rootTasks: propRootTasks,
  onOpenDetails,
  onToggleStatus,
  onFocusTask
}) => {
  const [activePath, setActivePath] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState(3);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Identify Root Tasks
  const rootTasks = useMemo(() => {
    if (propRootTasks && propRootTasks.length > 0) return propRootTasks;
    
    // Fallback: local discovery if explicit roots aren't provided
    const targetTaskIds = new Set<string>();
    tasks.forEach(t => t.links?.forEach(l => targetTaskIds.add(l.toTaskId)));
    return tasks.filter(t => !targetTaskIds.has(t.id));
  }, [tasks, propRootTasks]);

  // 2. Resolve Successors
  const getSuccessors = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.links) return [];
    
    return task.links
        .filter(link => link.fromTaskId === taskId)
        .map(link => {
            const target = tasks.find(t => t.id === link.toTaskId) || link.toTask;
            return target ? { ...target, linkType: link.type } : null;
        })
        .filter(t => !!t) as (Task & { linkType: string })[];
  };

  // 3. Handle Navigation
  const handleSelect = (taskId: string, depth: number) => {
    const newPath = activePath.slice(0, depth);
    newPath.push(taskId);
    setActivePath(newPath);
    onFocusTask(taskId);
  };

  // Auto-scroll logic
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [activePath.length, visibleColumns]);

  const focusedTask = useMemo(() => 
    tasks.find(t => t.id === activePath[activePath.length - 1]) || null
  , [tasks, activePath]);

  const incomingLinks = useMemo(() => {
    if (!focusedTask) return [];
    return tasks
      .filter(t => t.id !== focusedTask.id && t.links?.some(l => l.toTaskId === focusedTask.id && l.fromTaskId === t.id))
      .map(t => ({
        ...t,
        linkType: t.links?.find(l => l.toTaskId === focusedTask.id)?.type || 'Relative'
      }));
  }, [tasks, focusedTask]);

  // Breadcrumb Truncation Logic
  const renderBreadcrumbs = () => {
    const maxVisibleCrumbs = 4;
    if (activePath.length <= maxVisibleCrumbs) {
      return activePath.map((id, index) => {
        const task = tasks.find(t => t.id === id);
        return (
          <React.Fragment key={id}>
            <button 
              onClick={() => setActivePath(activePath.slice(0, index + 1))}
              className="text-[9px] font-bold uppercase tracking-widest text-primary/80 hover:text-primary transition-all truncate max-w-[100px]"
            >
              {task?.title || 'Unknown'}
            </button>
            {index < activePath.length - 1 && <ChevronRight size={10} className="text-white/5 mx-1" />}
          </React.Fragment>
        );
      });
    }

    const firstCrumb = activePath[0];
    const lastCrumbs = activePath.slice(-2);
    const firstTask = tasks.find(t => t.id === firstCrumb);

    return (
      <div className="flex items-center">
        <button 
          onClick={() => setActivePath(activePath.slice(0, 1))}
          className="text-[9px] font-bold uppercase tracking-widest text-primary/80 hover:text-primary"
        >
          {firstTask?.title || 'Root'}
        </button>
        <ChevronRight size={10} className="text-white/5 mx-1" />
        <span className="text-[9px] text-muted-foreground/30 font-bold tracking-widest px-1">...</span>
        <ChevronRight size={10} className="text-white/5 mx-1" />
        {lastCrumbs.map((id, idx) => {
          const task = tasks.find(t => t.id === id);
          const globalIndex = activePath.length - 2 + idx;
          return (
            <React.Fragment key={id}>
              <button 
                onClick={() => setActivePath(activePath.slice(0, globalIndex + 1))}
                className="text-[9px] font-bold uppercase tracking-widest text-primary/80 hover:text-primary truncate max-w-[100px]"
              >
                {task?.title || 'Unknown'}
              </button>
              {idx === 0 && <ChevronRight size={10} className="text-white/5 mx-1" />}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // Sliding Window Logic
  // If visibleColumns is 3, we show the last 2 steps of activePath + its successors
  const windowedPath = activePath.slice(-(visibleColumns - 1));
  const windowOffset = Math.max(0, activePath.length - windowedPath.length);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* Task Flow Header */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-white/5 bg-background shrink-0 select-none">
        <div className="flex items-center overflow-hidden">
           <div className="flex items-center gap-1.5 mr-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/20 italic">Task Flow</div>
           <div className="h-4 w-px bg-white/5 mr-4" />
           {renderBreadcrumbs()}
        </div>

        {/* View Settings Slider */}
        <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/5">
            <div className="flex items-center gap-3">
                <Settings2 size={12} className="text-muted-foreground/30" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 shrink-0">
                  Columns: {visibleColumns}
                </span>
                <input 
                  type="range" 
                  min="1" 
                  max="8" 
                  value={visibleColumns} 
                  onChange={(e) => setVisibleColumns(parseInt(e.target.value))}
                  className="w-24 h-1 bg-white/5 rounded-full appearance-none accent-primary cursor-pointer hover:bg-white/10 transition-colors"
                />
            </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Horizontal Flow Container */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 flex overflow-x-auto overflow-y-hidden no-scrollbar"
        >
          {/* Always show root if it's within the window or if we are at root depth */}
          {(windowOffset === 0) && (
             <div className="w-[280px] shrink-0 border-r border-white/5 flex flex-col pt-6 pb-20">
               <div className="px-6 mb-4">
                   <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Primary Level</h4>
               </div>
               <div className="flex-1 overflow-y-auto px-4 space-y-1.5 custom-scrollbar">
                 {rootTasks.map(task => (
                   <TaskNode 
                     key={task.id}
                     task={task}
                     isSelected={activePath[0] === task.id}
                     onClick={() => handleSelect(task.id, 0)}
                     onToggleStatus={onToggleStatus}
                   />
                 ))}
               </div>
             </div>
          )}

          {/* Render Windowed Columns */}
          {windowedPath.map((parentId, idx) => {
            const globalIndex = windowOffset + idx;
            const children = getSuccessors(parentId);
            if (children.length === 0) return null;

            return (
              <motion.div 
                key={`${parentId}-${globalIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-[280px] shrink-0 border-r border-white/5 flex flex-col pt-6 pb-20"
              >
                <div className="px-6 mb-4">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">
                    Step {globalIndex + 1}
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto px-4 space-y-1.5 custom-scrollbar">
                  {children.map(task => (
                    <TaskNode 
                      key={task.id}
                      task={task}
                      linkType={task.linkType}
                      isSelected={activePath[globalIndex + 1] === task.id}
                      onClick={() => handleSelect(task.id, globalIndex + 1)}
                      onToggleStatus={onToggleStatus}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}

          {/* End Spacing */}
          <div className="w-[200px] shrink-0 flex items-center justify-center opacity-5">
              <Plus size={20} className="text-muted-foreground" />
          </div>
        </div>

        {/* Focal Sidebar */}
        <AnimatePresence>
          {focusedTask && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="w-[340px] border-l border-white/5 bg-background shrink-0 flex flex-col"
            >
              <div className="p-8 pb-6">
                <div className="flex items-center gap-2 mb-4">
                    <RelationshipPill label={focusedTask.status} size="sm" />
                </div>
                <h2 className="text-lg font-bold tracking-tight mb-2 leading-tight">{focusedTask.title}</h2>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {focusedTask.description || 'No direct analysis available.'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-6 custom-scrollbar">
                {/* Connectivity */}
                <div className="space-y-4">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Lineage</h4>
                    <div className="space-y-2">
                        {incomingLinks.length > 0 ? (
                            incomingLinks.map(link => (
                                <button 
                                    key={link.id} 
                                    onClick={() => {
                                        const story = link.story?.[0];
                                        if (story) setActivePath(story.pathTaskIds);
                                        else setActivePath([link.id]);
                                    }}
                                    className="w-full p-3 rounded-lg border border-white/5 hover:border-primary/30 transition-all text-left group"
                                >
                                    <div className="flex items-center justify-between mb-1 opacity-40 group-hover:opacity-100">
                                        <span className="text-[7px] font-black uppercase tracking-widest text-primary">{link.linkType}</span>
                                        <ArrowRight size={10} />
                                    </div>
                                    <div className="text-[10px] font-bold truncate">{link.title}</div>
                                </button>
                            ))
                        ) : (
                            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/20 font-bold italic">No upstream links.</p>
                        )}
                    </div>
                </div>

                {/* Assignment */}
                <div className="space-y-3">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Owner</h4>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="p-1 bg-white/5 rounded">
                            <User size={10} className="text-muted-foreground" />
                        </div>
                        <span className="text-[10px] font-bold">{focusedTask.assignee?.username || 'Unassigned'}</span>
                    </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/5">
                <button 
                  onClick={() => onOpenDetails(focusedTask.id)}
                  className="w-full py-2.5 bg-foreground text-background rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-sm"
                >
                    View Task Details
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
