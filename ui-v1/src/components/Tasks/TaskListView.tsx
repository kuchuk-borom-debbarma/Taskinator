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
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

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

  // ─── Virtualizer ────────────────────────────────────────────────────────────
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92, // matches the rendered h-[80px] card + mb-3 gap
    overscan: 8,
  });

  // ─── Refs ────────────────────────────────────────────────────────────────────
  const lastTriggeredNextRef = useRef<string | null>(null);
  const lastTriggeredPrevRef = useRef<string | null>(null);
  const cooldownRef = useRef(false);
  const prevTotalSizeRef = useRef(0);
  // Prevents "load previous" from firing on the very first render before any
  // scrolling has occurred (firstItem.index === 0 is always true on mount).
  const isInitializedRef = useRef(false);

  // ─── Reset on project change ──────────────────────────────────────────────
  // If projectId changes the task list is cleared; reset all dedup state so the
  // new list doesn't inherit stale cursor guards.
  useEffect(() => {
    isInitializedRef.current = false;
    lastTriggeredNextRef.current = null;
    lastTriggeredPrevRef.current = null;
    prevTotalSizeRef.current = 0;
  }, [projectId]);

  // ─── Scroll restoration on prepend ──────────────────────────────────────────
  // Run synchronously before the browser paints so the viewport doesn't flash
  // to the top when previous pages are prepended.
  useLayoutEffect(() => {
    if (!parentRef.current) return;

    const currentTotalSize = rowVirtualizer.getTotalSize();

    if (!isFetchingPreviousPage && prevTotalSizeRef.current > 0) {
      const sizeDiff = currentTotalSize - prevTotalSizeRef.current;
      if (sizeDiff > 0) {
        parentRef.current.scrollTop += sizeDiff;
      }
    }

    prevTotalSizeRef.current = currentTotalSize;
  }, [tasks.length, isFetchingPreviousPage, rowVirtualizer.getTotalSize()]);

  // ─── Bi-directional scroll trigger ───────────────────────────────────────────
  // Keep latest prop values in a ref so the scroll listener never needs to be
  // re-attached — this eliminates the double-call that happened when
  // rowVirtualizer.getVirtualItems() was listed as a dependency (it creates a
  // new array reference every render, making the effect re-run on every paint).
  const scrollPropsRef = useRef({
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    tasks,
    onLoadMore,
    onLoadPrev,
  });
  useEffect(() => {
    scrollPropsRef.current = {
      hasNextPage,
      hasPreviousPage,
      isFetchingNextPage,
      isFetchingPreviousPage,
      tasks,
      onLoadMore,
      onLoadPrev,
    };
  });

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const handleScroll = () => {
      const {
        hasNextPage,
        hasPreviousPage,
        isFetchingNextPage,
        isFetchingPreviousPage,
        tasks,
        onLoadMore,
        onLoadPrev,
      } = scrollPropsRef.current;

      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        lastTriggeredPrevRef.current = tasks[0]?.id ?? null;
        lastTriggeredNextRef.current = tasks[tasks.length - 1]?.id ?? null;
        return;
      }

      if (cooldownRef.current) return;

      const virtualItems = rowVirtualizer.getVirtualItems();
      if (virtualItems.length === 0) return;

      const firstItem = virtualItems[0];
      const lastItem = virtualItems[virtualItems.length - 1];

      // ── Load next page (scroll down) ──────────────────────────────────────
      if (lastItem.index >= tasks.length - 1 && hasNextPage && !isFetchingNextPage && onLoadMore) {
        const lastTaskId = tasks[tasks.length - 1]?.id;
        if (lastTaskId && lastTaskId !== lastTriggeredNextRef.current) {
          console.log(`[SCROLL] Fetch next — last task: ${lastTaskId}`);
          lastTriggeredNextRef.current = lastTaskId;
          cooldownRef.current = true;
          onLoadMore();
          setTimeout(() => { cooldownRef.current = false; }, 300);
        }
      }

      // ── Load previous page (scroll up) ────────────────────────────────────
      if (
        firstItem.index === 0 &&
        el.scrollTop < 60 &&
        hasPreviousPage &&
        !isFetchingPreviousPage &&
        onLoadPrev
      ) {
        const firstTaskId = tasks[0]?.id;
        if (firstTaskId && firstTaskId !== lastTriggeredPrevRef.current) {
          console.log(`[SCROLL] Fetch previous — first task: ${firstTaskId}`);
          lastTriggeredPrevRef.current = firstTaskId;
          cooldownRef.current = true;
          onLoadPrev();
          setTimeout(() => { cooldownRef.current = false; }, 300);
        }
      }
    };

    // Seed dedup refs on mount without firing a fetch
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length > 0 && !isInitializedRef.current) {
      isInitializedRef.current = true;
      lastTriggeredPrevRef.current = scrollPropsRef.current.tasks[0]?.id ?? null;
      lastTriggeredNextRef.current = scrollPropsRef.current.tasks[scrollPropsRef.current.tasks.length - 1]?.id ?? null;
    }

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
    // Only re-attach listener when projectId changes (props handled via ref above)
  }, [projectId, rowVirtualizer]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-120px)] overflow-y-auto px-6 py-4 md:px-16 w-full max-w-5xl mx-auto custom-scrollbar"
    >
      <header className="mb-10 pt-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Tasks</h1>
        <p className="text-slate-300/80 text-lg">
          Continuous stream of project dependencies and progress.
        </p>
      </header>

      {/* Spinner shown above list when loading older pages */}
      {isFetchingPreviousPage && (
        <div className="flex items-center justify-center py-4 opacity-30">
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
        // The outer div must have the virtualizer's total size so the scrollbar
        // reflects the full content height even though only a window is rendered.
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const task = tasks[virtualRow.index];
            if (!task) return null;

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <TaskListItem task={task} />
              </div>
            );
          })}
        </div>
      )}

      {/* Spinner shown below list when loading newer pages */}
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-10 opacity-30">
          <Loader2 size={24} className="animate-spin text-focus-blue" />
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