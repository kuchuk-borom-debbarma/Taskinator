import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  lazyRouteComponent,
  redirect
} from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { type AuthContextType } from './context/AuthContext';
import { AuthScreen } from './components/Auth/AuthScreen';
import { NotFoundComponent, GlobalErrorComponent } from './components/Layout/RouterFeedback';
import { RootComponent } from './components/Layout/RootComponent';
import { ProjectDashboard } from './components/Dashboard/ProjectDashboard';
import { LayoutProvider } from './context/LayoutContext';
import { CreateProjectModal } from './components/Project/CreateProjectModal';

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
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-notion text-text-notion relative">
      {/* Top Nav */}
      <header className="flex h-16 shrink-0 items-center px-6 border-b border-app-line/40 bg-white/40 backdrop-blur-md z-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-accent/10 text-app-accent transition group-hover:bg-app-accent group-hover:text-white">
            <span className="font-bold">T</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-app-ink">Taskinator</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="glass-panel rounded-[32px] min-h-full overflow-hidden flex flex-col relative">
          <Outlet />
        </div>
      </main>
      <CreateProjectModal />
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

// Fullscreen Dedicated Layout (No Sidebar)
const fullscreenLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'fullscreen-layout',
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return;
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/auth' });
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
  validateSearch: (search: Record<string, unknown>): TaskSearch => {
    return {
      cursor: (search.cursor as string) || undefined,
      direction: (search.direction as 'forward' | 'backward') || undefined,
    };
  },
  component: lazyRouteComponent(() => import('./ProjectTeamsView.lazy.tsx')),
});

const projectMembersRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: 'members',
  component: lazyRouteComponent(() => import('./ProjectMembersView.lazy.tsx')),
});

const projectAutoActionRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: 'autoAction',
  component: lazyRouteComponent(
    () => import('./components/AutoAction/AutoActionDashboardView').then(m => ({ default: m.AutoActionDashboardView }))
  ),
});

const teamDetailRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: 'teams/$teamId',
  validateSearch: (search: Record<string, unknown>): TaskSearch => {
    return {
      cursor: (search.cursor as string) || undefined,
      direction: (search.direction as 'forward' | 'backward') || undefined,
    };
  },
  component: lazyRouteComponent(() => import('./TeamDetailPage.lazy.tsx')),
});

import { TaskGraphView } from './components/Tasks/TaskGraphView';

const projectGraphRoute = createRoute({
  getParentRoute: () => fullscreenLayoutRoute,
  path: 'graph/$projectId',
  validateSearch: (search: Record<string, unknown>): LinkSearch => {
    return {
      taskId: (search.taskId as string) || undefined,
      inCursor: (search.inCursor as string) || undefined,
      inDir: (search.inDir as 'forward' | 'backward') || undefined,
      outCursor: (search.outCursor as string) || undefined,
      outDir: (search.outDir as 'forward' | 'backward') || undefined,
    };
  },
  component: () => {
    const { projectId } = projectGraphRoute.useParams();
    const search = projectGraphRoute.useSearch();
    return <TaskGraphView projectId={projectId} focusedTaskId={search.taskId} />;
  },
});

type LinkSearch = {
  taskId?: string;
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
      projectAutoActionRoute,
      teamDetailRoute,
      taskDetailRoute,
    ]),
  ]),
  fullscreenLayoutRoute.addChildren([
    projectGraphRoute,
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
