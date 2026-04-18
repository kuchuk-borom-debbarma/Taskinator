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


  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-120px)] overflow-y-auto px-6 py-4 md:px-16 w-full max-w-5xl mx-auto custom-scrollbar flex flex-col"
    >
      <header className="mb-8 pt-6 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Tasks</h1>
          <p className="text-slate-300/80 text-lg">
            Project dependencies and progress.
          </p>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={onLoadPrev}
            disabled={!hasPreviousPage || isFetchingPreviousPage}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-20 hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center transition-all"
            title="Previous Page"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={onLoadMore}
            disabled={!hasNextPage || isFetchingNextPage}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-20 hover:bg-white/10 transition-all active:scale-95 flex items-center justify-center transition-all"
            title="Next Page"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {(isFetchingPreviousPage || isFetchingNextPage) && (
        <div className="flex items-center justify-center py-4 absolute top-24 right-16">
          <Loader2 size={18} className="animate-spin text-focus-blue" />
        </div>
      )}

      {tasks.length === 0 && !isFetchingNextPage && !isFetchingPreviousPage ? (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
          <Archive size={48} className="mb-4 text-slate-500" />
          <p className="text-xl font-bold">No tasks found</p>
          <p className="text-sm">Get started by creating your first task.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskListItem key={task.id} task={task} />
          ))}

        </div>
      )}
    </div>
  );
};

// ─── Task row ──────────────────────────────────────────────────────────────────

const TaskListItem: React.FC<{ task: ProjectTask }> = ({ task }) => {
  const incomingCount = task.directIncomingLinksCount ?? 0;
  const outgoingCount = task.directOutgoingLinksCount ?? 0;

  return (
    <Link
      to="/projects/$projectId/tasks/$taskId"
      params={{ projectId: task.projectId, taskId: task.id }}
      className="group glass-card-dark flex items-start justify-between py-4 px-4 text-sm transition-all duration-150 hover:bg-slate-800/70 hover:border-white/12 rounded-2xl mb-3 h-[80px]"
    >
      <div className="flex items-center gap-4 flex-1 overflow-hidden h-full">
        <StatusIcon status={task.status} size={18} />

        <div className="flex flex-col gap-1 flex-1 overflow-hidden">
          <span className="font-bold text-white group-hover:text-blue-300 text-base leading-tight truncate">
            {task.title}
          </span>

          <div className="flex items-center gap-4 opacity-40">
            {incomingCount > 0 && (
              <div className="flex items-center gap-1">
                <ArrowDownLeft size={10} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">
                  {incomingCount} Deps
                </span>
              </div>
            )}
            {outgoingCount > 0 && (
              <div className="flex items-center gap-1">
                <ArrowUpRight size={10} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">
                  {outgoingCount} Impacts
                </span>
              </div>
            )}
            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-white/5 rounded-md border border-white/5">
              {task.status}
            </span>
          </div>
        </div>
      </div>

      <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 bg-white/5 border border-white/5 rounded-full whitespace-nowrap self-center">
        {new Date(task.updatedAt).toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short',
        })}
      </span>
    </Link>
  );
};

// ─── Status icon ───────────────────────────────────────────────────────────────

const StatusIcon: React.FC<{ status: string; size?: number }> = ({ status, size = 14 }) => {
  switch (status.toUpperCase()) {
    case 'DONE': return <CheckCircle2 size={size} className="text-done" />;
    case 'IN_PROGRESS': return <Clock size={size} className="text-incoming" />;
    case 'IN_REVIEW': return <Eye size={size} className="text-sky-400" />;
    case 'BLOCKED': return <AlertCircle size={size} className="text-red-500" />;
    default: return <Circle size={size} className="text-todo" />;
  }
};