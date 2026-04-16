import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  ChevronLeft,
  MoreVertical, 
  Plus, 
  Share2,
  Users2, 
  User, 
  Target,
  ArrowRight
} from 'lucide-react';
import { cn } from '../utils/cn';
import { RelationshipPill } from './RelationshipPill';
import { RelationshipLines } from './RelationshipLines';
import type { Task } from '../types';

interface TaskDrillViewProps {
  tasks: Task[];
  focusedTaskId: string | null;
  onFocusTask: (taskId: string | null) => void;
  onOpenDetails: (taskId: string) => void;
  onToggleStatus: (task: Task) => void;
  onCreateTask: () => void;
}

export const TaskDrillView: React.FC<TaskDrillViewProps> = ({
  tasks,
  focusedTaskId,
  onFocusTask,
  onOpenDetails,
  onToggleStatus,
  onCreateTask
}) => {
  // 1. Resolve Focal Task
  const focalTask = useMemo(() => 
    tasks.find(t => t.id === focusedTaskId) || null
  , [tasks, focusedTaskId]);

  // 2. Resolve Inbound Links (Who links TO focalTask?)
  const inboundLinks = useMemo(() => {
    if (!focusedTaskId) return [];
    return tasks.filter(t => 
      t.links?.some(l => l.toTaskId === focusedTaskId)
    ).map(t => ({
        task: t,
        linkType: t.links!.find(l => l.toTaskId === focusedTaskId)!.type
    }));
  }, [tasks, focusedTaskId]);

  // 3. Resolve Outbound Links (Who does focalTask link TO?)
  const outboundLinks = useMemo(() => {
    if (!focalTask || !focalTask.links) return [];
    return focalTask.links.map(link => ({
        task: tasks.find(t => t.id === link.toTaskId),
        linkType: link.type,
        linkId: link.id
    })).filter(l => !!l.task);
  }, [tasks, focalTask]);

  // 4. Coordinates for SVG lines (Simplified for now - can be enhanced with refs)
  const connections = useMemo(() => {
    // This is a placeholder for dynamic coordinate calculation
    return [];
  }, [inboundLinks, outboundLinks]);

  if (!focusedTaskId || !focalTask) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-5xl mx-auto px-10">
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
        >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary">
                <Target size={40} />
            </div>
            <h2 className="text-3xl font-black mb-2">Project Neural Map</h2>
            <p className="text-muted-foreground mb-8">Select a task to anchor your focus and explore its network.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {tasks.slice(0, 6).map(task => (
                    <button
                        key={task.id}
                        onClick={() => onFocusTask(task.id)}
                        className="glass p-4 rounded-2xl border border-white/5 hover:border-primary/30 transition-all text-left group"
                    >
                        <div className="font-bold truncate group-hover:text-primary transition-colors">{task.title}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
                            {task.links?.length || 0} connections
                        </div>
                    </button>
                ))}
            </div>
            
            <button 
                onClick={onCreateTask}
                className="mt-10 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all flex items-center gap-2 mx-auto"
            >
                <Plus size={18} /> Add Anchor Task
            </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full w-full max-w-[1400px] mx-auto overflow-hidden">
      
      {/* Neural Header */}
      <div className="flex items-center justify-between px-10 py-6 shrink-0 border-b border-white/5 bg-background/50 backdrop-blur-md z-20">
         <div className="flex items-center gap-6">
            <button 
                onClick={() => onFocusTask(null)}
                className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground transition-all"
            >
                <ChevronLeft size={20} />
            </button>
            <div>
                <h1 className="text-xl font-black tracking-tight">{focalTask.title}</h1>
                <div className="flex items-center gap-3 mt-1">
                    <RelationshipPill label={focalTask.status} />
                    <span className="text-[10px] text-muted-foreground/40 uppercase font-black tracking-tighter">
                        Focused Task Node
                    </span>
                </div>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={() => onOpenDetails(focalTask.id)} className="p-2 hover:bg-white/5 rounded-xl text-muted-foreground transition-all">
                <MoreVertical size={20} />
            </button>
         </div>
      </div>

      <div className="flex-1 relative flex overflow-hidden">
        {/* SVG Plane */}
        <RelationshipLines connections={connections} />

        <div className="flex h-full w-full divide-x divide-white/5 overflow-hidden">
            
            {/* LEFT: SOURCES (Inbound) */}
            <div className="w-1/4 h-full flex flex-col bg-white/[0.01]">
                <div className="p-6 border-b border-white/5 flex items-center gap-2 text-muted-foreground">
                    <Share2 size={14} className="rotate-180" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Linked From</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {inboundLinks.map(({ task, linkType }) => (
                        <motion.div 
                            key={task.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                            onClick={() => onFocusTask(task.id)}
                        >
                            <RelationshipPill label={linkType} size="sm" className="mb-2" />
                            <div className="text-sm font-bold truncate group-hover:text-primary transition-colors">{task.title}</div>
                        </motion.div>
                    ))}
                    {inboundLinks.length === 0 && (
                        <div className="h-full flex items-center justify-center text-center p-6 text-muted-foreground/20 italic text-sm">
                            No incoming connections
                        </div>
                    )}
                </div>
            </div>

            {/* CENTER: FOCUS (Active) */}
            <div className="flex-1 h-full bg-white/[0.02] flex flex-col relative overflow-hidden">
                <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
                    <motion.div 
                        key={focalTask.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto"
                    >
                        <div className="mb-8">
                            <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/40 mb-2 block">Description</label>
                            <div className="text-lg leading-relaxed text-foreground/80 font-medium">
                                {focalTask.description || "No description provided."}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 py-8 border-y border-white/5">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/40 mb-2 block">Assigned To</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                                            <User size={16} />
                                        </div>
                                        <span className="font-bold">{focalTask.assignee?.username || 'Unassigned'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/40 mb-2 block">Team</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
                                            <Users2 size={16} />
                                        </div>
                                        <span className="font-bold">{focalTask.team?.name || 'General Project'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-end items-end">
                                <button 
                                    onClick={() => onToggleStatus(focalTask)}
                                    className={cn(
                                        "px-6 py-3 rounded-2xl border font-black transition-all flex items-center gap-3",
                                        focalTask.status === 'DONE' 
                                            ? "bg-primary/10 border-primary/20 text-primary" 
                                            : "bg-white/5 border-white/10 text-foreground hover:scale-105"
                                    )}
                                >
                                    {focalTask.status === 'DONE' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                    {focalTask.status}
                                </button>
                            </div>
                        </div>

                        {/* Story/Transitive Summary (If needed in future) */}
                    </motion.div>
                </div>
            </div>

            {/* RIGHT: TARGETS (Outbound) */}
            <div className="w-1/4 h-full flex flex-col bg-white/[0.01]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Share2 size={14} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Connects To</span>
                    </div>
                    <button 
                        onClick={() => onOpenDetails(focalTask.id)} 
                        className="p-1 hover:bg-primary/20 rounded-md text-primary transition-all"
                        title="Add Relationship"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {outboundLinks.map(({ task, linkType, linkId }) => (
                        <motion.div 
                            key={linkId}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                            onClick={() => onFocusTask(task!.id)}
                        >
                            <RelationshipPill label={linkType} size="sm" className="mb-2" />
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-bold truncate group-hover:text-primary transition-colors pr-2">{task!.title}</div>
                                <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </motion.div>
                    ))}
                    {outboundLinks.length === 0 && (
                        <div className="h-full flex items-center justify-center text-center p-6 text-muted-foreground/20 italic text-sm">
                            No outgoing connections
                        </div>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
