import React, { useRef, useEffect, useLayoutEffect } from 'react';
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
  projectId: string;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  isFetchingNextPage?: boolean;
  isFetchingPreviousPage?: boolean;
  onLoadMore?: () => void;
  onLoadPrev?: () => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  projectId,
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
            Perspective: High-performance task orchestration.
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
          <p className="text-lg font-bold text-white mb-1">No tasks in this perspective</p>
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

// ─── Task row (Refined) ────────────────────────────────────────────────────────

const TaskListItem: React.FC<{ task: ProjectTask }> = ({ task }) => {
  const incomingCount = task.directIncomingLinksCount ?? 0;
  const outgoingCount = task.directOutgoingLinksCount ?? 0;
  
  // Combine label counts for summary
  const labels = [
    ...task.incomingLabelCounts.map(l => l.label),
    ...task.outgoingLabelCounts.map(l => l.label)
  ];
  const uniqueLabels = Array.from(new Set(labels)).slice(0, 2);

  return (
    <Link
      to="/projects/$projectId/tasks/$taskId"
      params={{ projectId: task.projectId, taskId: task.id }}
      className="group flex flex-col sm:flex-row sm:items-center gap-4 py-5 px-6 border-b border-white/[0.04] transition-all duration-200 hover:bg-white/[0.02] last:border-0"
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="mt-1 flex-shrink-0">
          <PriorityIcon priority={task.priority} />
        </div>
        
        <div className="mt-0.5 flex-shrink-0">
          <StatusIcon status={task.status} size={16} />
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-[15px] font-bold text-slate-100 group-hover:text-focus-blue transition-colors truncate">
            {task.title}
          </h3>
          <p className="text-[13px] text-text-dim line-clamp-2 max-w-2xl font-medium leading-normal italic opacity-60 group-hover:opacity-100 transition-opacity">
            {task.description || "No description provided."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 sm:pl-4">
        {/* Connection Summaries */}
        <div className="flex items-center gap-3">
          {(incomingCount > 0 || outgoingCount > 0) && (
            <div className="flex items-center -space-x-1.5 grayscale group-hover:grayscale-0 transition-all opacity-40 group-hover:opacity-100">
              {incomingCount > 0 && (
                <div className="h-6 px-1.5 flex items-center justify-center rounded-md bg-incoming/10 border border-incoming/20 text-incoming" title="Incoming Dependencies">
                  <span className="text-[9px] font-black">{incomingCount}</span>
                </div>
              )}
              {outgoingCount > 0 && (
                <div className="h-6 px-1.5 flex items-center justify-center rounded-md bg-outgoing/10 border border-outgoing/20 text-outgoing" title="Outgoing Impact">
                  <span className="text-[9px] font-black">{outgoingCount}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="hidden lg:flex items-center gap-1.5">
            {uniqueLabels.map(label => (
              <span key={label} className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 capitalize">
                {label}
              </span>
            ))}
            {labels.length > 2 && (
              <span className="text-[10px] text-text-dim font-bold">+{labels.length - 2}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <span className="text-[11px] font-bold text-slate-500 tabular-nums whitespace-nowrap opacity-60">
            {new Date(task.updatedAt).toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short',
            })}
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-focus-blue transition-colors flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
};

// ─── Priority Icon ────────────────────────────────────────────────────────────

const PriorityIcon: React.FC<{ priority: number }> = ({ priority }) => {
  let colorClass = "text-priority-low";
  let label = "Low";
  
  if (priority === 1) { colorClass = "text-priority-urgent shadow-[0_0_8px_rgba(153,27,27,0.4)]"; label = "Urgent"; }
  else if (priority === 2) { colorClass = "text-priority-high"; label = "High"; }
  else if (priority === 3) { colorClass = "text-priority-medium"; label = "Medium"; }

  return (
    <div className={`w-1.5 h-1.5 rounded-full ${colorClass} bg-current`} title={`Priority: ${label}`} />
  );
};

const StatusIcon: React.FC<{ status: string; size?: number }> = ({ status, size = 14 }) => {
  switch (status.toUpperCase()) {
    case 'DONE': return <CheckCircle2 size={size} className="text-done" />;
    case 'IN_PROGRESS': return <Clock size={size} className="text-incoming" />;
    case 'IN_REVIEW': return <Eye size={size} className="text-sky-400" />;
    case 'BLOCKED': return <AlertCircle size={size} className="text-red-500" />;
    default: return <Circle size={size} className="text-todo" />;
  }
};