import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  lazyRouteComponent,
  redirect
} from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useAuth, type AuthContextType } from './context/AuthContext';
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
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-notion text-text-notion relative">
      {/* Top Nav */}
      <header className="flex h-14 shrink-0 items-center justify-between px-6 border-b border-slate-200/50 bg-white/60 backdrop-blur-md z-10">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-app-accent to-indigo-500 text-white shadow-sm transition group-hover:scale-105 duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-4.5 w-4.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-app-ink to-slate-700 bg-clip-text text-transparent">Task-In</span>
        </Link>

        <div className="flex items-center gap-4">
          {user?.username && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 border border-slate-200/40 px-3 py-1.5 text-xs font-bold text-app-ink shadow-sm">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-app-accent-soft text-[10px] font-black text-app-accent">
                {user.username.substring(0, 2).toUpperCase()}
              </div>
              <span>@{user.username}</span>
            </div>
          )}
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 text-xs font-bold text-red-600 transition duration-300 cursor-pointer shadow-sm shadow-red-100/50"
            title="Sign out"
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </button>
        </div>
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

const projectAutomationsRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: 'automations',
  component: lazyRouteComponent(() => import('./components/Project/AutomationDashboard')),
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
      projectAutomationsRoute,
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
