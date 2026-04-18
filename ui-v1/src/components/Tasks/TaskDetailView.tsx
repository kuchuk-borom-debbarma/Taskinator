import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../context/ApiContext';
import { TaskMap } from '../Graph/TaskMap';
import { TaskMapModal } from '../Graph/TaskMapModal';
import { ChevronLeft, Calendar, Map, Layers, Users, User, Clock, CheckCircle2, Type, Copy, Circle, Edit3, Check, X } from 'lucide-react';

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
}

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

const getStatusInfo = (s: string) => {
  const statuses: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'TODO':        { label: 'To Do',       color: '#94a3b8', icon: <Circle size={13} className="text-todo" /> },
    'IN_PROGRESS': { label: 'In Progress', color: 'var(--color-focus-blue)', icon: <Clock size={13} className="text-focus-blue" /> },
    'DONE':        { label: 'Done',        color: 'var(--color-done)', icon: <CheckCircle2 size={13} className="text-done" /> },
  };
  return statuses[s] || { label: s, color: '#888', icon: null };
};

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ taskId, onClose }) => {
  const { taskApi } = useApi();
  const queryClient = useQueryClient();
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const { data: task, isLoading: isTaskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: { status?: string; title?: string; description?: string }) =>
      taskApi.updateTask(taskId, updates as any),
    onSuccess: (updated) => {
      queryClient.setQueryData(['task', taskId], updated);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingStatus(false);
      setEditingTitle(false);
    },
  });

  if (isTaskLoading || !task) {
    return (
      <div className="p-20 text-text-dim text-center animate-pulse font-medium tracking-tight h-screen flex items-center justify-center bg-bg-notion">
        Loading task properties...
      </div>
    );
  }

  const statusInfo = getStatusInfo(task.status);

  const handleCopyId = () => {
    navigator.clipboard.writeText(task.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = (newStatus: string) => {
    updateMutation.mutate({ status: newStatus });
  };

  const handleTitleSave = () => {
    if (titleDraft.trim() && titleDraft !== task.title) {
      updateMutation.mutate({ title: titleDraft.trim() });
    } else {
      setEditingTitle(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-bg-notion flex flex-col items-center overflow-x-hidden selection:bg-focus-blue/10 selection:text-focus-blue">
      <div className="w-full max-w-4xl px-8 py-12 flex flex-col gap-12">
        
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2">
          <button 
            onClick={onClose} 
            className="flex items-center gap-1.5 text-text-dim text-[13px] font-semibold py-1 px-2 rounded-md -ml-2 hover:bg-bg-secondary hover:text-text-notion transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <div className="w-px h-3 bg-border-notion mx-1" />
          <span className="text-[13px] font-medium text-text-dim opacity-60">Task Detail</span>
        </nav>

        {/* Primary Header */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded border border-border-notion text-[9px] font-bold uppercase tracking-tighter text-text-dim w-fit opacity-50">
              {task.id}
            </div>
            <button 
              onClick={handleCopyId}
              className={`p-1 rounded hover:bg-bg-secondary transition-all ${copied ? 'text-done scale-110' : 'text-text-dim opacity-30 hover:opacity-100'}`}
              title="Copy ID"
            >
              {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
            </button>
          </div>

          {/* Editable Title */}
          {editingTitle ? (
            <div className="flex items-start gap-3">
              <textarea
                autoFocus
                className="flex-1 text-[38px] font-bold tracking-tight text-text-notion leading-tight bg-bg-secondary border border-focus-blue/40 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-focus-blue"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTitleSave(); } if (e.key === 'Escape') setEditingTitle(false); }}
              />
              <div className="flex flex-col gap-1.5 mt-2">
                <button onClick={handleTitleSave} className="p-2 rounded-lg bg-focus-blue text-white hover:bg-focus-blue/90 transition-colors shadow-sm"><Check size={14} /></button>
                <button onClick={() => setEditingTitle(false)} className="p-2 rounded-lg bg-bg-secondary border border-border-notion text-text-dim hover:text-text-notion transition-colors"><X size={14} /></button>
              </div>
            </div>
          ) : (
            <div className="group relative flex items-start gap-3">
              <h1 className="text-[42px] font-bold tracking-tight text-text-notion leading-tight flex-1">
                {task.title}
              </h1>
              <button
                onClick={() => { setTitleDraft(task.title); setEditingTitle(true); }}
                className="mt-3 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-bg-secondary text-text-dim transition-all"
                title="Edit title"
              >
                <Edit3 size={15} />
              </button>
            </div>
          )}
        </header>

        {/* ─── PROPERTIES DASHBOARD ─── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-12 p-8 border border-border-notion rounded-2xl bg-white shadow-sm">
          
          {/* Status — Editable */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-text-dim opacity-50">
              <Layers size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Status</span>
            </div>
            {editingStatus ? (
              <div className="flex flex-col gap-1.5">
                {STATUS_OPTIONS.map(s => {
                  const info = getStatusInfo(s);
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={updateMutation.isPending}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold border transition-all ${task.status === s ? 'border-focus-blue bg-focus-blue/5 text-focus-blue' : 'border-border-notion hover:border-text-dim text-text-notion'}`}
                    >
                      {info.icon}
                      {info.label}
                    </button>
                  );
                })}
                <button onClick={() => setEditingStatus(false)} className="text-[11px] text-text-dim hover:text-text-notion transition-colors mt-1">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setEditingStatus(true)}
                className="flex items-center gap-2 text-[15px] font-semibold text-text-notion hover:text-focus-blue transition-colors group"
              >
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
                <Edit3 size={11} className="opacity-0 group-hover:opacity-40 transition-opacity ml-1" />
              </button>
            )}
          </div>

          <PropertyBlock 
            icon={<Users size={14} />} 
            label="Assigned Team" 
            value={task.team?.name || 'Unassigned'} 
            isDimmed={!task.team}
          />
          <PropertyBlock 
            icon={<User size={14} />} 
            label="Assignee" 
            value={task.assignee?.username || 'Unassigned'} 
            isDimmed={!task.assignee}
          />
          <PropertyBlock 
            icon={<User size={14} />} 
            label="Creator" 
            value={task.createdById || 'System'} 
          />
          <PropertyBlock 
            icon={<Calendar size={14} />} 
            label="Created" 
            value={new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} 
          />
          <PropertyBlock 
            icon={<Clock size={14} />} 
            label="Updated" 
            value={new Date(task.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} 
          />
        </section>

        {/* ─── SUPPORTING CONTENT ─── */}
        <div className="flex flex-col gap-16">
          
          {/* Description Section */}
          <section className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] opacity-40">
              <Type size={14} /> Description
            </div>
            <p className="text-[17px] leading-relaxed text-text-notion/90 whitespace-pre-wrap max-w-2xl">
              {task.description || "No description provided."}
            </p>
          </section>

          {/* Task Map Integration */}
          <section className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] opacity-40">
              Connections
            </div>
            <button 
              onClick={() => setIsMapOpen(true)}
              className="group flex items-center gap-6 p-6 border border-border-notion rounded-2xl bg-bg-secondary/30 hover:bg-bg-secondary transition-all text-left w-full max-w-2xl"
            >
              <div className="p-4 rounded-xl bg-white border border-border-notion shadow-sm text-focus-blue group-hover:scale-110 transition-transform">
                <Map size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-text-notion font-bold text-base">Open Workspace Map</span>
                <span className="text-text-dim text-[13px]">Explore dependencies and related tasks.</span>
              </div>
            </button>
          </section>
        </div>

        <TaskMapModal 
          isOpen={isMapOpen} 
          onClose={() => setIsMapOpen(false)} 
          title={task.title}
        >
          <TaskMap projectId={task.projectId} taskId={taskId} />
        </TaskMapModal>

        <footer className="w-full flex justify-between items-center opacity-30 mt-20">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Taskinator</div>
        </footer>
      </div>
    </div>
  );
};

const PropertyBlock: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; isDimmed?: boolean }> = ({ icon, label, value, isDimmed }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2 text-text-dim opacity-50">
      {icon}
      <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <div className={`text-[15px] font-semibold ${isDimmed ? 'text-text-dim font-medium opacity-40' : 'text-text-notion'}`}>
      {value}
    </div>
  </div>
);
