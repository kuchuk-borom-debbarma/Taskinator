import React, { useMemo, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useApi } from '../../context/ApiContext';
import { getLinkLabelColor } from '../../utils/color';
import { Loader2, ArrowRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface TaskLinkColumnProps {
  taskId: string;
  direction: 'incoming' | 'outgoing';
  title: string;
}

export const TaskLinkColumn: React.FC<TaskLinkColumnProps> = ({ taskId, direction, title }) => {
  const { taskApi } = useApi();
  const parentRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['task-links', taskId, direction],
    queryFn: ({ pageParam }) => 
      direction === 'incoming' 
        ? taskApi.getTaskIncomingLinks(taskId, 15, pageParam)
        : taskApi.getTaskOutgoingLinks(taskId, 15, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
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

  const rowVirtualizer = useVirtualizer({
    count: virtualData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => virtualData[index].type === 'header' ? 40 : 85,
    overscan: 10,
  });

  const isTriggeringRef = useRef(false);

  // Reset the trigger guard when fetching finishes
  useEffect(() => {
    if (!isFetchingNextPage) {
      isTriggeringRef.current = false;
    }
  }, [isFetchingNextPage]);

  // Infinite Scroll Trigger
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0 || isTriggeringRef.current) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (
      lastItem.index >= virtualData.length - 5 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      isTriggeringRef.current = true;
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, virtualData.length, fetchNextPage, rowVirtualizer.getVirtualItems()]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 w-full">
         <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
         <div className="h-20 w-full bg-slate-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-dim opacity-50 px-2">{title}</h3>
      
      <div 
        ref={parentRef}
        className="flex-1 w-full overflow-y-auto custom-scrollbar pr-2 min-h-[400px]"
      >
        {virtualData.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-border-notion rounded-2xl flex items-center justify-center text-text-dim/40 text-[13px] font-medium italic">
            No {direction} links found
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
              const item = virtualData[virtualRow.index];
              const isHeader = item.type === 'header';

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
                  className="px-1"
                >
                  {isHeader ? (
                    <div className="flex items-center gap-2 h-full pt-4 pb-2">
                       <div 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: getLinkLabelColor(item.label) }}
                       />
                       <span className="text-[10px] font-black uppercase tracking-widest text-text-notion/60">{item.label}</span>
                       <div className="flex-1 h-px bg-border-notion opacity-50" />
                    </div>
                  ) : (
                    <Link
                      to="/projects/$projectId/tasks/$taskId"
                      params={{ 
                        projectId: item.link.projectId, 
                        taskId: direction === 'incoming' ? item.link.sourceTask.id : item.link.targetTask.id 
                      }}
                      className="group flex flex-col justify-center px-4 h-[75px] bg-white border border-border-notion rounded-xl hover:border-focus-blue/30 hover:shadow-md transition-all mb-2"
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
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {isFetchingNextPage && (
          <div className="py-4 flex justify-center opacity-30">
            <Loader2 size={16} className="animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};
