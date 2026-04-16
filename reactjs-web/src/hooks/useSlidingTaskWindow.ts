import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTaskById, fetchTaskPage } from '../data/taskSource';
import type { Task, TaskLink, TaskPage } from '../types';

const MAX_PAGES_IN_MEMORY = 3;

interface WindowState {
  pages: Map<number, TaskPage>;
  loading: boolean;
  focusedTask: Task | null;
}

export function useSlidingTaskWindow(page: number, taskId: string) {
  const [state, setState] = useState<WindowState>({
    pages: new Map(),
    loading: true,
    focusedTask: null,
  });
  const requestId = useRef(0);

  const loadPage = useCallback(async (targetPage: number) => {
    const currentRequest = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true }));
    const [current, previous, next, focusedTask] = await Promise.all([
      fetchTaskPage(targetPage),
      targetPage > 0 ? fetchTaskPage(targetPage - 1) : Promise.resolve(null),
      fetchTaskPage(targetPage + 1),
      fetchTaskById(taskId),
    ]);

    if (currentRequest !== requestId.current) return;

    setState(() => {
      const pages = new Map<number, TaskPage>();
      for (const candidate of [previous, current, next]) {
        if (candidate && Math.abs(candidate.page - targetPage) < MAX_PAGES_IN_MEMORY) {
          pages.set(candidate.page, candidate);
        }
      }
      return { pages, loading: false, focusedTask };
    });
  }, [taskId]);

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  return useMemo(() => {
    const orderedPages = [...state.pages.values()].sort((a, b) => a.page - b.page);
    const tasks = orderedPages.flatMap((entry) => entry.tasks);
    const taskMap = new Map(tasks.map((task) => [task.id, task]));
    const links = dedupeLinks(orderedPages.flatMap((entry) => entry.links));
    const stories = dedupeStories(orderedPages.flatMap((entry) => entry.stories ?? []));
    const currentPage = state.pages.get(page);

    return {
      tasks,
      taskMap,
      links,
      stories,
      focusedTask: state.focusedTask,
      loading: state.loading,
      loadedPageCount: state.pages.size,
      loadedTaskCount: tasks.length,
      hasPrevious: currentPage?.hasPrevious ?? page > 0,
      hasNext: currentPage?.hasNext ?? true,
    };
  }, [page, state]);
}

function dedupeLinks(links: TaskLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.id)) return false;
    seen.add(link.id);
    return true;
  });
}

function dedupeStories(stories: TaskPage['stories']) {
  const seen = new Set<string>();
  return stories.filter((story) => {
    if (seen.has(story.id)) return false;
    seen.add(story.id);
    return true;
  });
}
