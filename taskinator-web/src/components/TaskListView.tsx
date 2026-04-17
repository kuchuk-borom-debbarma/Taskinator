import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../graphql/client';
import { GET_TASKS, UPDATE_TASKS } from '../graphql/operations';
import { TaskNode } from './TaskNode';
import { Loader2, ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import type { Task } from '../types';
import { cn } from '../utils/cn';

interface TaskListViewProps {
  projectId: string;
  onOpenDetails: (taskId: string) => void;
}
export const TaskListView: React.FC<TaskListViewProps> = ({
  projectId,
  onOpenDetails
}) => {
  const qc = useQueryClient();
  const PAGE_SIZE = 15;

  // Pagination State
  const [cursor, setCursor] = useState<string | null>(null);
  const [direction, setDirection] = useState<'FORWARD' | 'BACKWARD'>('FORWARD');

  // Reset pagination when project changes
  useEffect(() => {
    setCursor(null);
    setDirection('FORWARD');
  }, [projectId]);

  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ['tasks', projectId, cursor, direction],
    queryFn: () => gqlClient.request<any>(GET_TASKS, { 
        projectId, 
        parentId: null, // Explicitly fetch root tasks
        first: direction === 'FORWARD' ? PAGE_SIZE : undefined,
        after: direction === 'FORWARD' ? (cursor || undefined) : undefined,
        last: direction === 'BACKWARD' ? PAGE_SIZE : undefined,
        before: direction === 'BACKWARD' ? (cursor || undefined) : undefined
    }),
    placeholderData: (prev) => prev,
    staleTime: 5000,
    enabled: !!projectId,
  });


  const connection = data?.tasks || { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } };
  const items: Task[] = connection.edges.map((e: any) => e.node);
  const pageInfo = connection.pageInfo;

  const updateMutation = useMutation({
    mutationFn: (updates: { id: string; version: number; status?: string; title?: string }) =>
      gqlClient.request<any>(UPDATE_TASKS, { projectId, tasks: [updates] }),
    onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  });

  // Persist Current Position (based on the end of the current page)
  useEffect(() => {
    if (pageInfo.endCursor) {
        localStorage.setItem(STORAGE_KEY, pageInfo.endCursor);
    }
  }, [pageInfo.endCursor, STORAGE_KEY]);

  const handleNext = () => {
    if (pageInfo.hasNextPage && pageInfo.endCursor) {
        setDirection('FORWARD');
        setCursor(pageInfo.endCursor);
        // Scroll to top of list
        const container = document.getElementById('task-list-container');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (pageInfo.hasPreviousPage && pageInfo.startCursor) {
        setDirection('BACKWARD');
        setCursor(pageInfo.startCursor);
        const container = document.getElementById('task-list-container');
        if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin opacity-20" />
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex flex-col items-center justify-center h-full opacity-40">
        <p className="text-sm font-bold uppercase tracking-widest text-red-500">Signal Interrupted</p>
        <p className="text-[10px] mt-2 italic">Failed to synchronize task lattice.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative px-10 pb-10">
      <div className="flex items-center justify-between py-6 mb-2">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-full border border-white/5">
                <Hash size={12} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">
                    Lattice Feed
                </span>
            </div>
            <div className="h-4 w-[1px] bg-white/5" />
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 italic">
                {items.length} Nodes Synchronized
            </div>
        </div>

        {/* Top Pagination Control */}
        <div className="flex items-center gap-2">
            <button 
                onClick={handlePrev}
                disabled={!pageInfo.hasPreviousPage || isPlaceholderData}
                className="p-2 glass rounded-xl border border-white/5 disabled:opacity-20 disabled:cursor-not-allowed hover:border-primary/30 transition-all"
                title="Previous Sector"
            >
                <ChevronLeft size={16} />
            </button>
            <button 
                onClick={handleNext}
                disabled={!pageInfo.hasNextPage || isPlaceholderData}
                className="p-2 glass rounded-xl border border-white/5 disabled:opacity-20 disabled:cursor-not-allowed hover:border-primary/30 transition-all"
                title="Next Sector"
            >
                <ChevronRight size={16} />
            </button>
        </div>
      </div>

      <div 
        id="task-list-container"
        className={cn(
            "flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-4 relative transition-opacity duration-300",
            isPlaceholderData ? "opacity-50" : "opacity-100"
        )}
      >
        {items.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center opacity-30 italic">
                <p className="text-sm font-bold uppercase tracking-widest">Horizon Empty</p>
                <p className="text-[10px] mt-2">No tasks found in this sector.</p>
            </div>
        ) : (
            <>
                <div className="grid gap-4">
                    {items.map((task) => (
                        <TaskNode 
                            key={task.id}
                            task={task}
                            onClick={() => onOpenDetails(task.id)}
                            onToggleStatus={(t) => updateMutation.mutate({ id: t.id, version: t.version, status: t.status === 'DONE' ? 'TODO' : 'DONE' })}
                            onUpdateTitle={(id, title) => updateMutation.mutate({ id, version: task.version, title })}
                        />
                    ))}
                </div>

                {/* Bottom Pagination Control */}
                <div className="pt-10 pb-6 flex items-center justify-center gap-8">
                    <button 
                        onClick={handlePrev}
                        disabled={!pageInfo.hasPreviousPage || isPlaceholderData}
                        className="flex items-center gap-3 px-6 py-3 glass rounded-2xl border border-white/5 disabled:opacity-20 disabled:cursor-not-allowed hover:border-primary/30 transition-all text-[11px] font-black uppercase tracking-widest group"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                        Previous Sector
                    </button>
                    <div className="h-10 w-[1px] bg-white/5" />
                    <button 
                        onClick={handleNext}
                        disabled={!pageInfo.hasNextPage || isPlaceholderData}
                        className="flex items-center gap-3 px-6 py-3 glass rounded-2xl border border-white/5 disabled:opacity-20 disabled:cursor-not-allowed hover:border-primary/30 transition-all text-[11px] font-black uppercase tracking-widest group"
                    >
                        Next Sector 
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </>
        )}
      </div>
    </div>
  );
};
