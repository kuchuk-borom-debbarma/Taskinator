import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import type { ProjectTask } from '../../api/types';
import { TaskLinkColumn } from './TaskLinkColumn';
import { ChevronLeft, Calendar, Layers, Users, User, Clock, CheckCircle2, Copy, Circle, Edit3, Check, X, PanelLeft, Network } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useLayout } from '../../context/LayoutContext';

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
}

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
const detailDateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const getStatusInfo = (s: string) => {
  const statuses: Record<string, { label: string; icon: React.ReactNode }> = {
    'TODO':        { label: 'To Do',       icon: <Circle size={13} className="text-todo" /> },
    'IN_PROGRESS': { label: 'In Progress', icon: <Clock size={13} className="text-focus-blue" /> },
    'DONE':        { label: 'Done',        icon: <CheckCircle2 size={13} className="text-done" /> },
  };
  return statuses[s] || { label: s, icon: null };
};

const getCachedTask = (queryClient: QueryClient, taskId: string) => {
  const directMatch = queryClient.getQueryData<ProjectTask>(['task', taskId]);
  if (directMatch) return directMatch;

  const taskPages = queryClient.getQueriesData<{ tasks: ProjectTask[] }>({
    queryKey: ['tasks'],
  });

  for (const [, page] of taskPages) {
    const task = page?.tasks?.find((entry) => entry.id === taskId);
    if (task) return task;
  }

  return undefined;
};

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ taskId, onClose }) => {
  const { taskApi } = useApi();
  const qc = useQueryClient();
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const [copied, setCopied] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId),
    initialData: () => getCachedTask(qc, taskId),
    staleTime: 1000 * 60 * 10,
  });

  const updateMut = useMutation({
    mutationFn: (u: { status?: string; title?: string }) => {
      if (!task) throw new Error('Task not loaded');
      return taskApi.updateTask(taskId, { projectId: task.project?.id || '', version: task.version, ...u });
    },
    onSuccess: (d) => {
      qc.setQueryData(['task', taskId], d);
      qc.setQueriesData<{ tasks: ProjectTask[] }>(
        { queryKey: ['tasks'] },
        (existing) => {
          if (!existing) return existing;
          return {
            ...existing,
            tasks: existing.tasks.map((entry) => (entry.id === d.id ? { ...entry, ...d } : entry)),
          };
        }
      );
      qc.invalidateQueries({ queryKey: ['task-links', taskId] });
      setEditingStatus(false);
      setEditingTitle(false);
    },
  });

  if (isLoading || !task) return <div className="p-20 text-text-dim text-center animate-pulse h-screen flex items-center justify-center bg-bg-notion">Loading...</div>;

  const si = getStatusInfo(task.status);

  return (
    <div className="w-full min-h-screen bg-bg-notion flex flex-col items-center overflow-x-hidden">
      <div className="w-full max-w-4xl px-8 py-12 flex flex-col gap-12">
        <nav className="flex items-center gap-2">
          {isSidebarCollapsed && <button onClick={toggleSidebar} className="p-1.5 mr-2 rounded-lg bg-bg-secondary border border-border-notion text-text-dim hover:text-text-notion transition-all active:scale-95"><PanelLeft size={16} /></button>}
          <button onClick={onClose} className="flex items-center gap-1.5 text-text-dim text-[13px] font-semibold py-1 px-2 rounded-md -ml-2 hover:bg-bg-secondary hover:text-text-notion transition-colors"><ChevronLeft size={16} />Back</button>
          <div className="w-px h-3 bg-border-notion mx-1" /><span className="text-[13px] font-medium text-text-dim opacity-60">Task Detail</span>
        </nav>

        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded border border-border-notion text-[9px] font-bold uppercase tracking-tighter text-text-dim w-fit opacity-50">{task.id}</div>
            <button onClick={() => { navigator.clipboard.writeText(task.id); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`p-1 rounded hover:bg-bg-secondary transition-all ${copied ? 'text-done' : 'text-text-dim opacity-30 hover:opacity-100'}`}>{copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}</button>
          </div>
          {editingTitle ? (
            <div className="flex items-start gap-3">
              <textarea autoFocus className="flex-1 text-[38px] font-bold tracking-tight text-text-notion leading-tight bg-bg-secondary border border-focus-blue/40 rounded-xl px-4 py-3 resize-none focus:outline-none" value={titleDraft} onChange={e => setTitleDraft(e.target.value)} rows={2} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (titleDraft.trim() && titleDraft !== task.title) updateMut.mutate({ title: titleDraft.trim() }); else setEditingTitle(false); } if (e.key === 'Escape') setEditingTitle(false); }} />
              <div className="flex flex-col gap-1.5 mt-2">
                <button onClick={() => { if (titleDraft.trim() && titleDraft !== task.title) updateMut.mutate({ title: titleDraft.trim() }); else setEditingTitle(false); }} className="p-2 rounded-lg bg-focus-blue text-white"><Check size={14} /></button>
                <button onClick={() => setEditingTitle(false)} className="p-2 rounded-lg bg-bg-secondary border border-border-notion text-text-dim"><X size={14} /></button>
              </div>
            </div>
          ) : (
            <div className="group relative flex items-start gap-3">
              <h1 className="text-[42px] font-bold tracking-tight text-text-notion leading-tight flex-1">{task.title}</h1>
              <button onClick={() => { setTitleDraft(task.title); setEditingTitle(true); }} className="mt-3 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-bg-secondary text-text-dim transition-all"><Edit3 size={15} /></button>
            </div>
          )}
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-12 p-8 border border-border-notion rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-text-dim opacity-50"><Layers size={14} /><span className="text-[11px] font-bold uppercase tracking-wider">Status</span></div>
            {editingStatus ? (
              <div className="flex flex-col gap-1.5">
                {STATUS_OPTIONS.map(s => { const info = getStatusInfo(s); return (<button key={s} onClick={() => updateMut.mutate({ status: s })} disabled={updateMut.isPending} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold border transition-all ${task.status === s ? 'border-focus-blue bg-focus-blue/5 text-focus-blue' : 'border-border-notion hover:border-text-dim text-text-notion'}`}>{info.icon}{info.label}</button>); })}
                <button onClick={() => setEditingStatus(false)} className="text-[11px] text-text-dim mt-1">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setEditingStatus(true)} className="flex items-center gap-2 text-[15px] font-semibold text-text-notion hover:text-focus-blue transition-colors group">{si.icon}<span>{si.label}</span><Edit3 size={11} className="opacity-0 group-hover:opacity-40 ml-1" /></button>
            )}
          </div>
          <PB icon={<Users size={14} />} label="Team" value={task.team?.name || 'Unassigned'} dim={!task.team} />
          <PB icon={<User size={14} />} label="Assignee" value={task.assignedMember?.username || 'Unassigned'} dim={!task.assignedMember} />
          <PB icon={<Calendar size={14} />} label="Created" value={detailDateFormatter.format(new Date(task.createdAt))} />
          <PB icon={<Clock size={14} />} label="Updated" value={detailDateFormatter.format(new Date(task.updatedAt))} />
          {task.createdBy && <PB icon={<User size={14} />} label="Created By" value={task.createdBy.username} />}
        </section>

        <div className="flex flex-col gap-16">
          <section className="flex flex-col gap-6">
            <div className="text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] opacity-40">Description</div>
            {task.description ? <p className="text-[17px] leading-relaxed text-text-notion/90 whitespace-pre-wrap max-w-2xl">{task.description}</p> : <p className="text-[15px] text-text-dim italic opacity-40">No description provided.</p>}
          </section>
          <section className="flex flex-col gap-10">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] opacity-40">Dependencies</div>
              <Link 
                to="/graph/$projectId" 
                params={{ projectId: task.project?.id || '' }}
                search={{ taskId }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-notion text-[11px] font-black uppercase tracking-widest text-text-dim hover:text-focus-blue hover:border-focus-blue/30 transition-all active:scale-95 shadow-sm"
              >
                <Network size={13} />
                View Dependency Graph
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white border border-border-notion rounded-3xl p-8 shadow-sm">
              <TaskLinkColumn taskId={taskId} direction="incoming" title="Incoming Dependencies" />
              <TaskLinkColumn taskId={taskId} direction="outgoing" title="Outgoing Impacts" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const PB: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; dim?: boolean }> = ({ icon, label, value, dim }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2 text-text-dim opacity-50">{icon}<span className="text-[11px] font-bold uppercase tracking-wider">{label}</span></div>
    <div className={`text-[15px] font-semibold ${dim ? 'text-text-dim font-medium opacity-40' : 'text-text-notion'}`}>{value}</div>
  </div>
);
