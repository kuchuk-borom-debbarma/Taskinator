import React, { useRef } from 'react';
import type { ProjectTask } from '../../api/types';
import { Link } from '@tanstack/react-router';
import {
  Circle,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Eye,
  Archive,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-120px)] overflow-y-auto px-4 py-8 md:px-12 w-full max-w-6xl mx-auto custom-scrollbar flex flex-col"
    >
      <header className="mb-10 flex items-center justify-between border-b border-white/5 pb-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Navigation
            <span className="text-[11px] font-black uppercase tracking-[0.2em] px-2 py-0.5 bg-focus-blue/20 text-focus-blue border border-focus-blue/30 rounded-full">
              {tasks.length} Current
            </span>
          </h1>
          <p className="text-text-dim text-sm font-medium">
            Project: High-performance task orchestration.
          </p>
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
          <p className="text-sm text-text-dim">Your workspace is currently quiet. Try a different range.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {tasks.map((task) => (
            <TaskListItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Task Card (Premium Revamp) ────────────────────────────────────────────────

const TaskListItem: React.FC<{ task: ProjectTask }> = ({ task }) => {
  const incomingCount = task.directIncomingLinksCount ?? 0;
  const outgoingCount = task.directOutgoingLinksCount ?? 0;
  
  // Aggregate label counts
  const labelMap = new Map<string, number>();
  [...(task.incomingLabelCounts || []), ...(task.outgoingLabelCounts || [])].forEach(lc => {
    labelMap.set(lc.label, (labelMap.get(lc.label) || 0) + lc.count);
  });
  
  const aggregatedLabels = Array.from(labelMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count); // Show highest counts first
  
  const displayLabels = aggregatedLabels.slice(0, 3);

  return (
    <Link
      to="/projects/$projectId/tasks/$taskId"
      params={{ projectId: task.projectId, taskId: task.id } as any}
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
        <p className="text-[14px] text-slate-400 leading-relaxed font-medium line-clamp-3">
          {task.description || "No description provided for this task orchestration node."}
        </p>
      </div>

      {/* Meta Bar: Tags, Team, Assignee, Priority */}
      <div className="flex flex-wrap items-center gap-3">
        <PriorityBadge priority={task.priority} />

        {task.team && (
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-slate-300 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-focus-blue/40" />
            {task.team.name}
          </div>
        )}

        {task.assignee && (
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-slate-300 shadow-sm">
            <span className="opacity-40 font-black">@</span>
            {task.assignee.username}
          </div>
        )}

        {displayLabels.length > 0 && (
          <div className="flex items-center gap-1.5 ml-1">
            {displayLabels.map(({ label, count }) => (
              <span key={label} className="text-[10px] font-black uppercase tracking-wider text-focus-blue/80 bg-focus-blue/10 px-2 py-0.5 rounded border border-focus-blue/20">
                {label} <span className="opacity-40 ml-0.5">({count})</span>
              </span>
            ))}
            {aggregatedLabels.length > 3 && (
              <span className="text-[10px] text-slate-500 font-bold ml-1">+{aggregatedLabels.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Links and Time */}
      <div className="pt-5 border-t border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 group-hover:gap-3 transition-all">
            {incomingCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-incoming/10 text-incoming rounded-md border border-incoming/20">
                <ArrowDownLeft size={12} strokeWidth={3} />
                <span className="text-[10px] font-black">{incomingCount}</span>
              </div>
            )}
            {outgoingCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-outgoing/10 text-outgoing rounded-md border border-outgoing/20">
                <ArrowUpRight size={12} strokeWidth={3} />
                <span className="text-[10px] font-black">{outgoingCount}</span>
              </div>
            )}
            {incomingCount === 0 && outgoingCount === 0 && (
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Isolated Node</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter tabular-nums opacity-60">
              Update {new Date(task.updatedAt).toLocaleDateString(undefined, {
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
    case 'IN_REVIEW': 
      label = "In Review"; 
      classes = "bg-sky-400/10 border-sky-400/20 text-sky-400"; 
      Icon = Eye; 
      break;
    case 'BLOCKED': 
      label = "Blocked"; 
      classes = "bg-red-500/10 border-red-500/20 text-red-500"; 
      Icon = AlertCircle; 
      break;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-[11px] font-bold shadow-sm ${classes}`}>
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </div>
  );
};