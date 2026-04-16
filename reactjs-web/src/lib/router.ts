import type { RouteState } from '../types';

const fallback: RouteState = {
  projectId: null,
  taskId: null,
  page: 0,
  view: 'trail',
};

export function parseRoute(pathname = window.location.pathname, search = window.location.search): RouteState {
  const parts = pathname.split('/').filter(Boolean);
  const projectIndex = parts.indexOf('projects');
  const taskIndex = parts.indexOf('tasks');
  const viewIndex = parts.indexOf('views');
  const params = new URLSearchParams(search);
  const pageParam = Number(params.get('page'));

  return {
    projectId: projectIndex >= 0 ? parts[projectIndex + 1] ?? null : null,
    taskId: taskIndex >= 0 ? parts[taskIndex + 1] ?? null : null,
    page: Number.isFinite(pageParam) && pageParam >= 0 ? pageParam : 0,
    view: viewIndex >= 0 && parts[viewIndex + 1] === 'trail' ? 'trail' : 'trail',
  };
}

export function buildRoute(route: RouteState) {
  if (!route.projectId) return '/';
  if (!route.taskId) {
    return `/projects/${route.projectId}?page=${route.page}`;
  }
  return `/projects/${route.projectId}/tasks/${route.taskId}/views/${route.view}?page=${route.page}`;
}

export function buildTaskRoute(projectId: string, taskId: string, page: number) {
  return buildRoute({ projectId, taskId, page, view: 'trail' });
}

export function fallbackRoute() {
  return fallback;
}
