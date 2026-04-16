import { useEffect, useMemo, useRef, useState } from 'react';
import { gql } from '../lib/api';
import { GET_TASKS } from '../lib/graphql';
import type { TaskConnection, TaskPage } from '../types';

const PAGE_SIZE = 14;

export function useTaskPages(projectId: string | null, token: string | null, page: number, refreshKey: number) {
  const [pages, setPages] = useState<Map<number, TaskPage>>(new Map());
  const [cursors, setCursors] = useState<Map<number, string | null>>(new Map([[0, null]]));
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    setPages(new Map());
    setCursors(new Map([[0, null]]));
  }, [projectId, refreshKey]);

  useEffect(() => {
    if (!projectId || !token) return;
    void ensurePage(page);
    void ensurePage(page + 1);
    if (page > 0) void ensurePage(page - 1);
  }, [projectId, token, page]);

  async function ensurePage(targetPage: number) {
    if (!projectId || !token || targetPage < 0) return;
    if (pages.has(targetPage)) return;

    const currentRequest = ++requestId.current;
    setLoading(true);

    const localCursors = new Map(cursors);
    let probe = 0;
    while (!localCursors.has(targetPage) && localCursors.has(probe)) {
      const after = localCursors.get(probe) ?? null;
      const response = await gql<{ tasks: TaskConnection }>(
        GET_TASKS,
        { projectId, first: PAGE_SIZE, after },
        token,
      );
      if (currentRequest !== requestId.current) return;

      const tasks = response.tasks.edges.map((edge) => edge.node);
      const pageData: TaskPage = {
        tasks,
        page: probe,
        hasPrevious: probe > 0,
        hasNext: response.tasks.pageInfo.hasNextPage,
      };

      setPages((prev) => {
        const next = new Map(prev);
        next.set(probe, pageData);
        for (const key of [...next.keys()]) {
          if (Math.abs(key - targetPage) > 1) next.delete(key);
        }
        return next;
      });

      if (response.tasks.pageInfo.hasNextPage) {
        localCursors.set(probe + 1, response.tasks.pageInfo.endCursor ?? null);
      }
      setCursors(new Map(localCursors));
      if (probe === targetPage) break;
      probe += 1;
      if (!response.tasks.pageInfo.hasNextPage) break;
    }

    setLoading(false);
  }

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
