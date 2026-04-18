import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { gql } from '../lib/api';
import { GET_TASKS } from '../lib/graphql';
import type { TaskConnection, TaskPage } from '../types';

const PAGE_SIZE = 14;

export function useTaskPages(projectId: string | null, token: string | null, page: number, refreshKey: number) {
  const [pages, setPages] = useState<Map<number, TaskPage>>(new Map());
  const [loading, setLoading] = useState(false);

  // Use Refs for synchronous state tracking across concurrent queue items
  const pagesRef = useRef<Map<number, TaskPage>>(new Map());
  const cursorsRef = useRef<Map<number, string | null>>(new Map([[0, null]]));
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const requestId = useRef(0);

  useEffect(() => {
    pagesRef.current = new Map();
    cursorsRef.current = new Map([[0, null]]);
    setPages(new Map());
  }, [projectId, refreshKey]);

  const ensurePage = useCallback((targetPage: number) => {
    if (!projectId || !token || targetPage < 0) return;

    // Queue requests to prevent concurrent probe loops fetching the exact same pages
    queueRef.current = queueRef.current.then(async () => {
      // Check if a previously queued request already fetched this page
      if (pagesRef.current.has(targetPage)) return;

      const currentRequest = ++requestId.current;
      setLoading(true);

      let probe = 0;
      while (!cursorsRef.current.has(targetPage) && cursorsRef.current.has(probe)) {
        const after = cursorsRef.current.get(probe) ?? null;
        const response = await gql<{ tasks: TaskConnection }>(
          GET_TASKS,
          { projectId, first: PAGE_SIZE, after },
          token,
        );

        if (currentRequest !== requestId.current) break;

        const tasks = response.tasks.edges.map((edge) => edge.node);

        // Update synchronous refs immediately so the next queued request sees it
        pagesRef.current.set(probe, {
          tasks,
          page: probe,
          hasPrevious: probe > 0,
          hasNext: response.tasks.pageInfo.hasNextPage,
        });

        if (response.tasks.pageInfo.hasNextPage) {
          cursorsRef.current.set(probe + 1, response.tasks.pageInfo.endCursor ?? null);
        }

        if (probe === targetPage) break;
        probe += 1;
        if (!response.tasks.pageInfo.hasNextPage) break;
      }

      // Sync React state and clean up distant pages memory
      setPages(() => {
        const next = new Map(pagesRef.current);
        for (const key of [...next.keys()]) {
          if (Math.abs(key - targetPage) > 1) {
            next.delete(key);
            pagesRef.current.delete(key);
          }
        }
        return next;
      });

      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }).catch(err => {
      console.error("[Pagination] Failed to fetch page", err);
      setLoading(false);
    });
  }, [projectId, token]);

  useEffect(() => {
    void ensurePage(page);
    void ensurePage(page + 1);
    if (page > 0) void ensurePage(page - 1);
  }, [page, ensurePage]);

  const allTasks = useMemo(() => [...pages.values()].flatMap((entry) => entry.tasks), [pages]);
  const taskMap = useMemo(() => new Map(allTasks.map((task) => [task.id, task])), [allTasks]);
  const current = pages.get(page);

  return {
    pages,
    tasks: current?.tasks ?? [],
    allTasks,
    taskMap,
    hasPrevious: page > 0,
    hasNext: current?.hasNext ?? true,
    loading,
    loadedTaskCount: allTasks.length,
    loadedPageCount: pages.size,
  };
}