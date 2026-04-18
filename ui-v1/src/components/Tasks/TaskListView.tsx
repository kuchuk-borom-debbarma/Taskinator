import React, { useMemo, useRef, useEffect } from 'react';
import type { ProjectTask, TaskLink } from '../../api/types';
import { Link } from '@tanstack/react-router';
import { Circle, CheckCircle2, Clock, ArrowDownLeft, ArrowUpRight, Loader2, AlertCircle, Eye, Archive } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface TaskListViewProps {
  tasks: ProjectTask[];
  links: TaskLink[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({ 
  tasks, 
  links, 
  hasNextPage, 
  isFetchingNextPage, 
  onLoadMore 
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // 1. Setup Virtualizer (Flat list, no headers)
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 90,
    overscan: 20,
  });

  // 2. Infinite Scroll Trigger
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (
      lastItem.index >= tasks.length - 8 && // Trigger early for smoothness
      hasNextPage &&
      !isFetchingNextPage &&
      onLoadMore
    ) {
      onLoadMore();
    }
  }, [hasNextPage, isFetchingNextPage, tasks.length, onLoadMore, rowVirtualizer.getVirtualItems()]);

  return (
    <div 
      ref={parentRef}
      className="h-[calc(100vh-120px)] overflow-y-auto px-6 py-4 md:px-16 w-full max-w-5xl mx-auto custom-scrollbar"
    >
      <header className="mb-10 pt-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Tasks</h1>
        <p className="text-slate-300/80 text-lg">Continuous stream of project dependencies and progress.</p>
      </header>

      {tasks.length === 0 && !isFetchingNextPage ? (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
           <Archive size={48} className="mb-4 text-slate-500" />
           <p className="text-xl font-bold">No tasks found</p>
           <p className="text-sm">Get started by creating your first task.</p>
        </div>
      ) : (
        <div 
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const task = tasks[virtualRow.index];

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <TaskListItem task={task} links={links} allTasks={tasks} />
              </div>
            );
          })}
        </div>
      )}

      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-10 opacity-30">
          <Loader2 size={24} className="animate-spin text-focus-blue" />
        </div>
      )}
    </div>
  );
};

const TaskListItem: React.FC<{
  task: ProjectTask;
  links: TaskLink[];
  allTasks: ProjectTask[];
}> = ({ task, links, allTasks }) => {
  const incomingLinks = links.filter(l => l.targetTaskId === task.id);
  const outgoingLinks = links.filter(l => l.sourceTaskId === task.id);

  const groupLabel = (linksArr: TaskLink[], type: 'source' | 'target') => {
    const grouped: Record<string, ProjectTask[]> = {};
    linksArr.forEach(link => {
      const taskId = type === 'source' ? link.sourceTaskId : link.targetTaskId;
      const t = allTasks.find(at => at.id === taskId);
      if (t) {
        if (!grouped[link.label]) grouped[link.label] = [];
        grouped[link.label].push(t);
      }
    });
    return grouped;
  };

  const incomingByLabel = groupLabel(incomingLinks, 'source');
  const outgoingByLabel = groupLabel(outgoingLinks, 'target');

  return (
    <Link 
      to="/projects/$projectId/tasks/$taskId"
      params={{ projectId: task.projectId, taskId: task.id }}
      className="group glass-card-dark flex items-start justify-between py-4 px-4 text-sm transition-all duration-150 hover:bg-slate-800/70 hover:border-white/12 rounded-2xl mb-3 h-[80px]"
    >
      <div className="flex items-center gap-4 flex-1 overflow-hidden h-full">
        <StatusIcon status={task.status} size={18} />
        
        <div className="flex flex-col gap-1 flex-1 overflow-hidden">
          <span className="font-bold text-white group-hover:text-blue-300 text-base leading-tight truncate">{task.title}</span>
          
          <div className="flex items-center gap-4 opacity-40">
             {Object.keys(incomingByLabel).length > 0 && (
               <div className="flex items-center gap-1">
                 <ArrowDownLeft size={10} />
                 <span className="text-[10px] font-bold uppercase tracking-tighter">{Object.values(incomingByLabel).flat().length} Deps</span>
               </div>
             )}
             {Object.keys(outgoingByLabel).length > 0 && (
               <div className="flex items-center gap-1">
                 <ArrowUpRight size={10} />
                 <span className="text-[10px] font-bold uppercase tracking-tighter">{Object.values(outgoingByLabel).flat().length} Impacts</span>
               </div>
             )}
             <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-white/5 rounded-md border border-white/5">{task.status}</span>
          </div>
        </div>
      </div>
      
      <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 bg-white/5 border border-white/5 rounded-full whitespace-nowrap self-center">
        {new Date(task.updatedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
      </span>
    </Link>
  );
};

const StatusIcon: React.FC<{ status: string, size?: number }> = ({ status, size = 14 }) => {
  switch (status.toUpperCase()) {
    case 'DONE': return <CheckCircle2 size={size} className="text-done" />;
    case 'IN_PROGRESS': return <Clock size={size} className="text-incoming" />;
    case 'IN_REVIEW': return <Eye size={size} className="text-sky-400" />;
    case 'BLOCKED': return <AlertCircle size={size} className="text-red-500" />;
    default: return <Circle size={size} className="text-todo" />;
  }
};
