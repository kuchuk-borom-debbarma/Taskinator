import React, { useRef } from 'react';
import type { ProjectTask } from '../../api/types';
import { Link } from '@tanstack/react-router';
import {
  Circle,
  CheckCircle2,
  Clock,
  Loader2,
  Archive,
  ChevronLeft,
  ChevronRight,
  PanelLeft
} from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';

interface TaskListViewProps {
  tasks: ProjectTask[];
  _projectId: string;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  isFetchingNextPage?: boolean;
  isFetchingPreviousPage?: boolean;
  onLoadMore?: () => void;
  onLoadPrev?: () => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  _projectId,
  hasNextPage,
  hasPreviousPage,
  isFetchingNextPage,
  isFetchingPreviousPage,
  onLoadMore,
  onLoadPrev,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const { isSidebarCollapsed, toggleSidebar } = useLayout();

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-120px)] overflow-y-auto px-4 py-8 md:px-12 w-full max-w-6xl mx-auto custom-scrollbar flex flex-col"
    >
      <header className="mb-10 flex items-center justify-between border-b border-white/5 pb-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            {isSidebarCollapsed && (
              <button 
                onClick={toggleSidebar}
                className="p-2 mr-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                title="Expand Sidebar"
              >
                <PanelLeft size={20} />
              </button>
            )}
            Tasks
            <span className="text-[11px] font-black uppercase tracking-[0.2em] px-2 py-0.5 bg-focus-blue/20 text-focus-blue border border-focus-blue/30 rounded-full">
              {tasks.length} Loaded
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLoadPrev}
            disabled={!hasPreviousPage || isFetchingPreviousPage}
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white shadow-sm transition-all hover:bg-white/10 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={onLoadMore}
            disabled={!hasNextPage || isFetchingNextPage}
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white shadow-sm transition-all hover:bg-white/10 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
          >
            {isFetchingNextPage || isFetchingPreviousPage ? (
              <Loader2 size={18} className="animate-spin text-focus-blue" />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        </div>
      </header>

      {tasks.length === 0 && !isFetchingNextPage && !isFetchingPreviousPage ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-white/20">
            <Archive size={32} />
          </div>
          <p className="text-lg font-bold text-white mb-1">No tasks in this project</p>
          <p className="text-sm text-text-dim">Create your first task to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {tasks.map((task) => (
            <TaskListItem key={task.id} task={task} _projectId={_projectId} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Task Card ──────────────────────────────────────────────────────────────

const TaskListItem: React.FC<{ task: ProjectTask; _projectId: string }> = ({ task, _projectId }) => {
  const projectId = task.project?.id || _projectId;

  return (
    <Link
      to="/projects/$projectId/tasks/$taskId"
      params={{ projectId: projectId || '', taskId: task.id } as any}
      className="group flex flex-col gap-6 p-7 mb-6 bg-white/[0.03] border border-white/5 rounded-2xl transition-all duration-300 hover:bg-white/[0.05] hover:border-focus-blue/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden"
    >
      {/* Selection Glow Effect */}
      <div className="absolute top-0 left-0 w-1 h-0 bg-focus-blue group-hover:h-full transition-all duration-500" />

      <div className="flex flex-col gap-4">
        {/* Header: Title and Status */}
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold text-slate-100 group-hover:text-focus-blue transition-colors leading-tight">
            {task.title}
          </h3>
          <StatusBadge status={task.status} />
        </div>

        {/* Body: Description */}
        {task.description && (
          <p className="text-[14px] text-slate-400 leading-relaxed font-medium line-clamp-3">
            {task.description}
          </p>
        )}
      </div>

      {/* Meta Bar: Team, Assignee, Priority */}
      <div className="flex flex-wrap items-center gap-3">
        <PriorityBadge priority={task.priority} />

        {task.team && (
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-slate-300 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-focus-blue/40" />
            {task.team.name}
          </div>
        )}

        {task.assignedMember && (
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-slate-300 shadow-sm">
            <span className="opacity-40 font-black">@</span>
            {task.assignedMember.username}
          </div>
        )}
      </div>

      {/* Footer: Time */}
      <div className="pt-5 border-t border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            {task.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter tabular-nums opacity-60">
            Updated {new Date(task.updatedAt).toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-focus-blue transition-all duration-300" />
        </div>
      </div>
    </Link>
  );
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

const PriorityBadge: React.FC<{ priority: number }> = ({ priority }) => {
  let config = { 
    label: "Low", 
    classes: "border-priority-low/20 text-priority-low bg-priority-low/5 shadow-[0_0_15px_-5px_rgba(20,184,166,0.3)]" 
  };
  
  if (priority === 1) config = { label: "Urgent", classes: "border-priority-urgent/30 text-priority-urgent bg-priority-urgent/10 shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)]" };
  else if (priority === 2) config = { label: "High", classes: "border-priority-high/20 text-priority-high bg-priority-high/5 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]" };
  else if (priority === 3) config = { label: "Medium", classes: "border-priority-medium/20 text-priority-medium bg-priority-medium/5 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]" };

  return (
    <div className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] ${config.classes}`}>
      {config.label}
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toUpperCase();
  let label = "Todo";
  let classes = "bg-todo/10 border-todo/20 text-todo";
  let Icon = Circle;

  switch (s) {
    case 'DONE': 
      label = "Completed"; 
      classes = "bg-done/10 border-done/20 text-done"; 
      Icon = CheckCircle2; 
      break;
    case 'IN_PROGRESS': 
      label = "In Progress"; 
      classes = "bg-incoming/10 border-incoming/20 text-incoming"; 
      Icon = Clock; 
      break;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-[11px] font-bold shadow-sm ${classes}`}>
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </div>
  );
};