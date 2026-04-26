import { 
  createRootRouteWithContext, 
  createRoute, 
  createRouter, 
  Outlet, 
  lazyRouteComponent,
  redirect
} from '@tanstack/react-router';
import { Sidebar } from './components/Layout/Sidebar';
import { type AuthContextType } from './context/AuthContext';
import { AuthScreen } from './components/Auth/AuthScreen';
import { NotFoundComponent, GlobalErrorComponent } from './components/Layout/RouterFeedback';
import { RootComponent } from './components/Layout/RootComponent';
import { ProjectDashboard } from './components/Dashboard/ProjectDashboard';
import { LayoutProvider, useLayout } from './context/LayoutContext';

interface MyRouterContext {
  auth: AuthContextType;
}

// Root Route - Handles Global State & Loading
export const rootRoute = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: GlobalErrorComponent,
});

// --- Layout Routes ---

const AuthenticatedLayout = () => {
  const { isSidebarCollapsed } = useLayout();
  return (
    <div className="flex h-screen overflow-hidden bg-bg-notion">
      <Sidebar />
      <main className={`flex-1 h-screen overflow-y-auto p-3 transition-all duration-300 ${isSidebarCollapsed ? 'pl-3' : 'pl-0'}`}>
        <div className="glass-panel-dark rounded-[32px] min-h-full overflow-hidden text-slate-100 flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// Authenticated Layout Shell
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated-layout',
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return;
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/auth' });
    }
  },
  component: () => (
    <LayoutProvider>
      <AuthenticatedLayout />
    </LayoutProvider>
  ),
});

// Primary Public Layout (Clean Shell)
const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public-layout',
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return;
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: () => <Outlet />,
});

// --- Auth Routes ---

const authRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/auth',
  component: () => <AuthScreen />,
});

// --- Protected Routes ---

type DashboardSearch = {
  cursor?: string;
  direction?: 'forward' | 'backward';
};

const indexRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): DashboardSearch => {
    return {
      cursor: (search.cursor as string) || undefined,
      direction: (search.direction as 'forward' | 'backward') || undefined,
    };
  },
  component: ProjectDashboard,
});

const projectLayoutRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'projects/$projectId',
  component: lazyRouteComponent(() => import('./components/Project/ProjectLayout').then(m => ({ default: m.ProjectLayout }))),
});

import ProjectDashboardView from './components/Project/ProjectDashboardView';

const projectDashboardRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/',
  component: ProjectDashboardView,
});

type TaskSearch = {
  cursor?: string;
  direction?: 'forward' | 'backward';
};

const projectTasksRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: 'tasks',
  validateSearch: (search: Record<string, unknown>): TaskSearch => {
    return {
      cursor: (search.cursor as string) || undefined,
      direction: (search.direction as 'forward' | 'backward') || undefined,
    };
  },
  component: lazyRouteComponent(() => import('./ProjectTasksIndex.lazy.tsx')),
});

const projectTeamsRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: 'teams',
  component: lazyRouteComponent(() => import('./ProjectTeamsView.lazy.tsx')),
});

const projectMembersRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: 'members',
  component: lazyRouteComponent(() => import('./ProjectMembersView.lazy.tsx')),
});

type LinkSearch = {
  inCursor?: string;
  inDir?: 'forward' | 'backward';
  outCursor?: string;
  outDir?: 'forward' | 'backward';
};

const taskDetailRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: 'tasks/$taskId',
  validateSearch: (search: Record<string, unknown>): LinkSearch => {
    return {
      inCursor: (search.inCursor as string) || undefined,
      inDir: (search.inDir as 'forward' | 'backward') || undefined,
      outCursor: (search.outCursor as string) || undefined,
      outDir: (search.outDir as 'forward' | 'backward') || undefined,
    };
  },
  component: lazyRouteComponent(() => import('./TaskDetailPage.lazy.tsx')),
});

// --- Route Tree Construction ---

export const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([
    authRoute,
  ]),
  authLayoutRoute.addChildren([
    indexRoute,
    projectLayoutRoute.addChildren([
      projectDashboardRoute,
      projectTasksRoute,
      projectTeamsRoute,
      projectMembersRoute,
      taskDetailRoute,
    ]),
  ]),
]);

export const router = createRouter({ 
  routeTree,
  context: {
    auth: undefined! 
  },
  defaultNotFoundComponent: NotFoundComponent,
  defaultErrorComponent: GlobalErrorComponent,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
