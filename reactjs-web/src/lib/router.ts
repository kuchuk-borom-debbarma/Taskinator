import { defaultTaskId, pageForTask } from '../data/taskSource';
import type { RouteState } from '../types';

const fallback: RouteState = {
  projectId: 'alpha',
  taskId: defaultTaskId,
  page: 0,
  view: 'trail',
};

export function parseRoute(pathname = window.location.pathname, search = window.location.search): RouteState {
  const parts = pathname.split('/').filter(Boolean);
  const projectIndex = parts.indexOf('projects');
  const taskIndex = parts.indexOf('tasks');
  const viewIndex = parts.indexOf('views');
  const params = new URLSearchParams(search);
  const taskId = taskIndex >= 0 ? parts[taskIndex + 1] ?? fallback.taskId : fallback.taskId;
  const pageParam = Number(params.get('page'));

  return {
    projectId: projectIndex >= 0 ? parts[projectIndex + 1] ?? fallback.projectId : fallback.projectId,
    taskId,
    page: Number.isFinite(pageParam) ? pageParam : pageForTask(taskId),
    view: viewIndex >= 0 && parts[viewIndex + 1] === 'trail' ? 'trail' : fallback.view,
  };
}

export function buildRoute(route: RouteState) {
  return `/projects/${route.projectId}/tasks/${route.taskId}/views/${route.view}?page=${route.page}`;
}
