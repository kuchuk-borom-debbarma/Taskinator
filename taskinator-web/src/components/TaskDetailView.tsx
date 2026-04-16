import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  User, 
  Users2, 
  Zap, 
  ChevronRight, 
  ArrowRight,
  Share2,
  GitBranch,
  Settings2,
  Clock,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { gqlClient } from '../graphql/client';
import { GET_TASKS, UPDATE_TASKS } from '../graphql/operations';
import { AutomationBuilderModal } from './AutomationBuilderModal';
import { RelationshipPill } from './RelationshipPill';
import { cn } from '../utils/cn';
import type { Task } from '../types';

interface TaskDetailViewProps {
  taskId: string;
  projectId: string;
  onClose: () => void;
  onJumpToTask: (id: string) => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  taskId,
  projectId,
  onClose,
  onJumpToTask
}) => {
  const qc = useQueryClient();
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => gqlClient.request<any>(GET_TASKS, { projectId, first: 1, after: undefined }), // In a real app, this would be GET_TASK_BY_ID
    // For this mock/modular monolith, we'll assume the resolver can handle a single ID or we filter the result
    select: (data) => data.tasks.edges.find((e: any) => e.node.id === taskId)?.node as Task
  });

  const task = data;

  const updateMutation = useMutation({
    mutationFn: (updates: any) => gqlClient.request<any>(UPDATE_TASKS, { projectId, tasks: [{ id: taskId, version: task?.version, ...updates }] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task', taskId] })
  });

  if (isLoading || !task) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full md:w-[600px] z-[100] bg-background/40 backdrop-blur-3xl border-l border-white/10 shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-8 border-b border-white/5">
        <div className="flex items-center gap-4">
             <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                <Settings2 size={24} />
             </div>
             <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">Perspective View</div>
                <h2 className="text-xl font-black tracking-tighter italic">Task Insight</h2>
             </div>
        </div>
        <button onClick={onClose} className="p-3 rounded-2xl border border-white/5 hover:bg-white/5 text-muted-foreground transition-all">
            <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
        {/* Basic Info */}
        <section className="space-y-6">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <RelationshipPill label={task.status} size="md" />
                    <button 
                         onClick={() => updateMutation.mutate({ status: task.status === 'DONE' ? 'TODO' : 'DONE' })}
                         className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[11px] font-black uppercase tracking-widest",
                            task.status === 'DONE' ? "border-primary text-primary bg-primary/5" : "border-white/10 text-muted-foreground hover:border-white/30"
                         )}
                    >
                        {task.status === 'DONE' ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        {task.status === 'DONE' ? 'Mark Incomplete' : 'Complete Signal'}
                    </button>
                </div>
                <input 
                    defaultValue={task.title}
                    onBlur={(e) => updateMutation.mutate({ title: e.target.value })}
                    className="w-full bg-transparent border-none outline-none text-3xl font-black tracking-tighter italic placeholder:text-white/5"
                    placeholder="Task Title..."
                />
            </div>
            
            <textarea 
                defaultValue={task.description || ''}
                onBlur={(e) => updateMutation.mutate({ description: e.target.value })}
                className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-sm text-muted-foreground min-h-[120px] outline-none focus:border-primary/20 transition-all font-medium leading-relaxed"
                placeholder="Synchronize detailed instructions here..."
            />
        </section>

        {/* Lineage / Synapse Trail */}
        <section className="space-y-4">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
                <GitBranch size={12} /> Synapse Trail (Lineage)
            </h4>
            <div className="flex flex-wrap items-center gap-2 p-4 glass rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold opacity-40">Primary</span>
                {task.story?.[0]?.pathTasks?.map((node: any) => (
                    <React.Fragment key={node.id}>
                        <ChevronRight size={12} className="opacity-20" />
                        <button 
                            onClick={() => onJumpToTask(node.id)}
                            className="text-[10px] font-black uppercase tracking-widest text-primary/80 hover:text-primary transition-all"
                        >
                            {node.title}
                        </button>
                    </React.Fragment>
                ))}
            </div>
        </section>

        {/* Connections / Synapses */}
        <section className="space-y-4">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
                <Share2 size={12} /> Established Synapses
            </h4>
            <div className="grid grid-cols-1 gap-3">
                {task.links?.map((link: any) => (
                    <button 
                        key={link.id}
                        onClick={() => onJumpToTask(link.toTaskId)}
                        className="flex items-center justify-between p-4 glass rounded-[20px] border border-white/5 hover:border-primary/30 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="text-[9px] font-black uppercase tracking-widest text-primary/60 px-2 py-1 rounded bg-primary/5 border border-primary/10">
                                {link.type}
                            </div>
                            <span className="text-sm font-bold opacity-80 group-hover:text-primary transition-colors italic">{link.toTask?.title}</span>
                        </div>
                        <ArrowRight size={16} className="text-muted-foreground/20 group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </button>
                ))}
                
                <button className="flex items-center justify-center p-4 border-2 border-dashed border-white/5 rounded-[20px] text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 hover:text-primary hover:border-primary/30 transition-all gap-2">
                    <Share2 size={14} /> Forge New Synapse
                </button>
            </div>
        </section>

        {/* Ownership */}
        <div className="grid grid-cols-2 gap-6">
            <div className="p-5 glass rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic">
                    <User size={12} /> Assigned Signal
                </div>
                <div className="text-sm font-bold opacity-80">{task.assignee?.username || 'Unassigned'}</div>
            </div>
            <div className="p-5 glass rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic">
                    <Users2 size={12} /> Team Domain
                </div>
                <div className="text-sm font-bold opacity-80">{task.team?.name || 'Global Domain'}</div>
            </div>
        </div>

        {/* Automations */}
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
                    <Zap size={12} className="text-yellow-500/50" /> Active Flows
                </h4>
                <button 
                    onClick={() => setIsAutomationOpen(true)}
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                >
                    Initialize Flow
                </button>
            </div>
            
            <div className="p-10 border-2 border-dashed border-white/5 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground/20 italic">
                    <Clock size={24} />
                </div>
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-20">No Automations Established</div>
                    <p className="text-[10px] text-muted-foreground/40 italic mt-1">Design triggers to automate structural shifts.</p>
                </div>
            </div>
        </section>
      </div>

      <div className="p-8 border-t border-white/5 flex justify-end gap-4">
            <button className="px-6 py-2.5 rounded-xl text-[12px] font-bold text-red-500 hover:bg-red-500/5 transition-all">
                Archive Node
            </button>
            <button onClick={onClose} className="px-8 py-2.5 bg-primary text-white rounded-xl text-[12px] font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                Confirm Synapse
            </button>
      </div>

      <AutomationBuilderModal 
        isOpen={isAutomationOpen}
        onClose={() => setIsAutomationOpen(false)}
        onSave={(rules) => {
            console.log('Saving automation rules:', rules);
            setIsAutomationOpen(false);
        }}
      />
    </motion.div>
  );
};
