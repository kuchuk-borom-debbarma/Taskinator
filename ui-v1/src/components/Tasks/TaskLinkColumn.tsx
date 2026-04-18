import React, { useMemo, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useApi } from '../../hooks/useApi';
import { getLinkLabelColor } from '../../utils/color';
import { Loader2, ArrowRight, ChevronRight, ChevronLeft } from 'lucide-react';
import { Link, useSearch, useNavigate } from '@tanstack/react-router';

interface TaskLinkColumnProps {
  taskId: string;
  direction: 'incoming' | 'outgoing';
  title: string;
}

export const TaskLinkColumn: React.FC<TaskLinkColumnProps> = ({ taskId, direction, title }) => {
  const { taskApi } = useApi();
  const parentRef = useRef<HTMLDivElement>(null);
  const search = useSearch({ from: '/authenticated-layout/projects/$projectId/tasks/$taskId' });
  const navigate = useNavigate();

  const isIncoming = direction === 'incoming';
  const cursor = isIncoming ? search.inCursor : search.outCursor;
  const dir = isIncoming ? search.inDir : search.outDir;

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    hasPreviousPage,
    isFetchingPreviousPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['task-links', taskId, direction, cursor, dir],
    queryFn: ({ pageParam }) => {
      const activeParam = pageParam || (cursor ? { direction: dir || 'forward', cursor } : undefined);
      const isBackward = activeParam?.direction === 'backward';
      const c = activeParam?.cursor;

      return direction === 'incoming'
        ? taskApi.getTaskIncomingLinks(taskId, isBackward ? undefined : 2, isBackward ? undefined : c, isBackward ? 2 : undefined, isBackward ? c : undefined)
        : taskApi.getTaskOutgoingLinks(taskId, isBackward ? undefined : 2, isBackward ? undefined : c, isBackward ? 2 : undefined, isBackward ? c : undefined);
    },
    initialPageParam: (cursor ? { direction: dir || 'forward', cursor } : undefined) as { direction: 'forward' | 'backward', cursor: string } | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? { direction: 'forward' as const, cursor: lastPage.endCursor! } : undefined,
    getPreviousPageParam: (firstPage) => firstPage.hasPreviousPage ? { direction: 'backward' as const, cursor: firstPage.startCursor! } : undefined,
    maxPages: 1,
  });

  // Flatten and Group
  const virtualData = useMemo(() => {
    const allLinks = data?.pages.flatMap(p => p.links) || [];

    // Grouping logic
    const groups: Record<string, typeof allLinks> = {};
    allLinks.forEach(link => {
      // Normalize: Trim and handle nulls, but keep casing for display if preferred
      // However, for grouping consistency, we use lowercase keys
      const displayLabel = (link.label || 'Related').trim();
      const groupKey = displayLabel.toLowerCase();

      if (!groups[groupKey]) {
        groups[groupKey] = { label: displayLabel, items: [] };
      }
      groups[groupKey].items.push(link);
    });

    const items: Array<{ type: 'header'; label: string } | { type: 'link'; link: any }> = [];
    Object.keys(groups).sort().forEach(key => {
      const group = groups[key];
      items.push({ type: 'header', label: group.label });
      group.items.forEach((link: any) => {
        items.push({ type: 'link', link });
      });
    });

    return items;
  }, [data]);


  const firstPage = data?.pages[0];
  const lastPage = data?.pages[data.pages.length - 1];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-4 w-24 bg-bg-secondary animate-pulse rounded" />
        <div className="h-20 w-full bg-bg-secondary animate-pulse rounded-2xl" />
        <div className="h-20 w-full bg-bg-secondary animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full relative">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-dim opacity-70">{title}</h3>
        
        <div className="flex items-center gap-1.5 scale-90 origin-right">
          <button
            onClick={() => {
               if (firstPage?.hasPreviousPage) {
                 navigate({
                   search: (prev: any) => ({ 
                     ...prev, 
                     [isIncoming ? 'inCursor' : 'outCursor']: firstPage.startCursor!,
                     [isIncoming ? 'inDir' : 'outDir']: 'backward' as const
                   }),
                 });
               }
            }}
            disabled={!firstPage?.hasPreviousPage || isFetchingPreviousPage}
            className="p-1.5 rounded-lg bg-bg-secondary border border-border-notion text-text-notion disabled:opacity-20 hover:bg-bg-notion transition-all active:scale-95 flex items-center justify-center transition-all shadow-sm"
            title="Previous"
          >
            <ChevronLeft size={14} className="text-text-notion" />
          </button>
          <button
            onClick={() => {
               if (lastPage?.hasNextPage) {
                 navigate({
                   search: (prev: any) => ({ 
                     ...prev, 
                     [isIncoming ? 'inCursor' : 'outCursor']: lastPage.endCursor!,
                     [isIncoming ? 'inDir' : 'outDir']: 'forward' as const
                   }),
                 });
               }
            }}
            disabled={!lastPage?.hasNextPage || isFetchingNextPage}
            className="p-1.5 rounded-lg bg-bg-secondary border border-border-notion text-text-notion disabled:opacity-20 hover:bg-bg-notion transition-all active:scale-95 flex items-center justify-center transition-all shadow-sm"
            title="Next"
          >
            {isFetchingNextPage || isFetchingPreviousPage ? (
              <Loader2 size={14} className="animate-spin text-focus-blue" />
            ) : (
              <ChevronRight size={14} className="text-text-notion" />
            )}
          </button>
        </div>
      </div>

      {(isFetchingPreviousPage || isFetchingNextPage) && (
        <div className="absolute top-0 right-14">
          <Loader2 size={12} className="animate-spin text-focus-blue" />
        </div>
      )}

      <div
        ref={parentRef}
        className="flex-1 w-full overflow-y-auto custom-scrollbar pr-2 min-h-[400px] flex flex-col gap-2"
      >
        {virtualData.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-border-notion rounded-2xl flex items-center justify-center text-text-dim/40 text-[13px] font-medium italic">
            No {direction} links found
          </div>
        ) : (
          <>
            {virtualData.map((item, idx) => {
              const isHeader = item.type === 'header';

              if (isHeader) {
                return (
                  <div key={idx} className="flex items-center gap-2 pt-4 pb-2 px-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: getLinkLabelColor(item.label) }}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-notion/60">{item.label}</span>
                    <div className="flex-1 h-px bg-border-notion opacity-50" />
                  </div>
                );
              }

              return (
                <Link
                  key={idx}
                  to="/projects/$projectId/tasks/$taskId"
                  params={{
                    projectId: item.link.projectId,
                    taskId: direction === 'incoming' ? item.link.sourceTask.id : item.link.targetTask.id
                  }}
                  className="group flex flex-col justify-center px-4 min-h-[75px] bg-white border border-border-notion rounded-xl hover:border-focus-blue/30 hover:shadow-md transition-all mb-1"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[14px] font-bold text-text-notion group-hover:text-focus-blue transition-colors line-clamp-1">
                      {(direction === 'incoming' ? item.link.sourceTask.title : item.link.targetTask.title) || 'Untitled Task'}
                    </span>
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-40 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-bold uppercase tracking-tighter opacity-40">
                      {direction === 'incoming' ? item.link.sourceTask.status : item.link.targetTask.status}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-border-notion" />
                    <span className="text-[9px] font-medium text-text-dim">
                      {new Date(item.link.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};