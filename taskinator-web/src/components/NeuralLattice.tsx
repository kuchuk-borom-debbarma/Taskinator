import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Plus, 
  Share2,
  Users2, 
  User, 
  Target,
  Maximize2
} from 'lucide-react';
import { LatticeNode } from './LatticeNode';
import { RelationshipPill } from './RelationshipPill';
import type { Task } from '../types';

interface NeuralLatticeProps {
  tasks: Task[];
  onOpenDetails: (taskId: string) => void;
  onToggleStatus: (task: Task) => void;
  onCreateTask: () => void;
  onFocusTask: (taskId: string | null) => void;
}

export const NeuralLattice: React.FC<NeuralLatticeProps> = ({
  tasks,
  onOpenDetails,
  onToggleStatus,
  onCreateTask,
  onFocusTask
}) => {
  const [activePath, setActivePath] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Identify Root Tasks (those with no incoming links)
  const rootTasks = useMemo(() => {
    const targetTaskIds = new Set<string>();
    tasks.forEach(t => t.links?.forEach(l => targetTaskIds.add(l.toTaskId)));
    return tasks.filter(t => !targetTaskIds.has(t.id));
  }, [tasks]);

  // 2. Resolve Successors for a given task ID (Direct Outgoing Links)
  const getSuccessors = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.links) return [];
    
    // Only follow links where THIS task is the origin
    return task.links
        .filter(link => link.fromTaskId === taskId)
        .map(link => {
            const target = tasks.find(t => t.id === link.toTaskId);
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

  // Auto-scroll to end on depth change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [activePath.length]);

  const focusedTask = useMemo(() => 
    tasks.find(t => t.id === activePath[activePath.length - 1]) || null
  , [tasks, activePath]);

  const incomingLinks = useMemo(() => {
    if (!focusedTask) return [];
    // Only includes tasks OTHER than the focused one that point TO the focused one
    return tasks
      .filter(t => t.id !== focusedTask.id && t.links?.some(l => l.toTaskId === focusedTask.id && l.fromTaskId === t.id))
      .map(t => ({
        ...t,
        linkType: t.links?.find(l => l.toTaskId === focusedTask.id)?.type || 'Relative'
      }));
  }, [tasks, focusedTask]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Path Header */}
      <div className="flex items-center gap-2 px-10 py-6 border-b border-white/5 bg-background/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
          <Target size={12} className="text-primary" />
          <span>Origin</span>
        </div>
        <ChevronRight size={14} className="text-white/10" />
        {activePath.map((id, index) => {
          const task = tasks.find(t => t.id === id);
          return (
            <React.Fragment key={id}>
              <button 
                onClick={() => setActivePath(activePath.slice(0, index + 1))}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-indigo-400 transition-all truncate max-w-[120px]"
              >
                {task?.title || 'Unknown'}
              </button>
              {index < activePath.length - 1 && (
                <ChevronRight size={14} className="text-white/10" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Horizontal Scrollable Lattice */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 flex overflow-x-auto overflow-y-hidden custom-scrollbar bg-[radial-gradient(#ffffff03_1px,_transparent_1px)] [background-size:40px_40px]"
        >
          {/* Level 0: Roots */}
          <div className="w-[320px] shrink-0 border-r border-white/5 flex flex-col pt-6 pb-20">
            <div className="px-6 mb-6 flex items-center justify-between">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">Root Nodes</h4>
                <button onClick={onCreateTask} className="p-1 hover:bg-white/5 rounded-lg text-primary transition-all">
                    <Plus size={16} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 space-y-3 custom-scrollbar">
              {rootTasks.map(task => (
                <LatticeNode 
                  key={task.id}
                  task={task}
                  isSelected={activePath[0] === task.id}
                  onClick={() => handleSelect(task.id, 0)}
                  onToggleStatus={onToggleStatus}
                />
              ))}
            </div>
          </div>

          {/* Dynamic Cascading Levels */}
          <AnimatePresence mode="popLayout">
            {activePath.map((parentId, index) => {
              const children = getSuccessors(parentId);
              if (children.length === 0) return null;

              return (
                <motion.div 
                  key={`${parentId}-${index}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-[320px] shrink-0 border-r border-white/5 flex flex-col pt-6 pb-20"
                >
                  <div className="px-6 mb-6">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Depth {index + 1} • Synapses
                    </h4>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 space-y-3 custom-scrollbar">
                    {children.map(task => (
                      <div key={task.id} className="relative">
                        <LatticeNode 
                          task={task}
                          linkType={task.linkType}
                          isSelected={activePath[index + 1] === task.id}
                          onClick={() => handleSelect(task.id, index + 1)}
                          onToggleStatus={onToggleStatus}
                        />
                        <div className="absolute top-2 -left-4 w-4 h-[1px] bg-primary/20" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty State / Add End-cap */}
          <div className="w-[400px] shrink-0 flex flex-col items-center justify-center p-12 opacity-20 hover:opacity-40 transition-opacity">
              <div className="p-8 border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center gap-4">
                  <Maximize2 size={32} className="text-muted-foreground" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center">
                    Extend the Lattice<br/>Forge new synapses
                  </p>
              </div>
          </div>
        </div>

        {/* Focal Sidebar - Persistent Details */}
        <AnimatePresence>
          {focusedTask && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="w-[400px] border-l border-white/5 glass bg-background/50 backdrop-blur-xl shrink-0 flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-white/5">
                <RelationshipPill label={focusedTask.status} size="sm" className="mb-4" />
                <h2 className="text-2xl font-black tracking-tight italic mb-2">{focusedTask.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {focusedTask.description || 'No focal analysis provided.'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Synapse Analytics */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Neural Mesh</h4>
                    <div className="space-y-3">
                        {incomingLinks.length > 0 ? (
                            incomingLinks.map(link => (
                                <div key={link.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 group hover:border-primary/40 transition-all">
                                    <div className="flex items-center justify-between mb-1">
                                        <RelationshipPill label={link.linkType} size="sm" />
                                        <button 
                                            onClick={() => {
                                                const story = link.story?.[0];
                                                if (story) {
                                                    setActivePath(story.pathTaskIds);
                                                } else {
                                                    // Fallback: Just show it as a root or best guess
                                                    setActivePath([link.id]);
                                                }
                                            }}
                                            className="text-[9px] font-black uppercase text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Pivot &rarr;
                                        </button>
                                    </div>
                                    <div className="text-[11px] font-bold truncate">{link.title}</div>
                                    <div className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-tighter mt-1">Source Node</div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 rounded-2xl border border-dashed border-white/5 text-center">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-20 text-muted-foreground">No Incoming Signals</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Team Assignees */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Strategists</h4>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <User size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-black truncate">{focusedTask.assignee?.username || 'Unassigned Signal'}</div>
                                <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Primary Agent</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground">
                                <Users2 size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-black truncate">{focusedTask.team?.name || 'Core Domain'}</div>
                                <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Affiliated Team</div>
                            </div>
                        </div>
                    </div>
                </div>
              </div>

              <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center gap-3">
                <button 
                  onClick={() => onOpenDetails(focusedTask.id)}
                  className="flex-1 py-4 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
                >
                    Expand Intelligence
                </button>
                <button className="p-4 glass rounded-2xl border border-white/5 text-muted-foreground hover:text-white transition-all">
                    <Share2 size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
