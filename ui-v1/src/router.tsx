import { 
  createRootRouteWithContext, 
  createRoute, 
  createRouter, 
  Outlet, 
  lazyRouteComponent,
  redirect
} from '@tanstack/react-router';
import { Sidebar } from './components/Layout/Sidebar';
import { useAuth, type AuthContextType } from './context/AuthContext';
import { AuthScreen } from './components/Auth/AuthScreen';
import { NotFoundComponent, GlobalErrorComponent } from './components/Layout/RouterFeedback';
import { RootComponent } from './components/Layout/RootComponent';
import { ProjectDashboard } from './components/Dashboard/ProjectDashboard';

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

// Authenticated Layout (Sidebar + Protected Content)
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
    <div className="flex h-screen overflow-hidden bg-bg-notion">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto p-3 pl-3">
        <div className="glass-panel-dark rounded-[32px] min-h-full overflow-hidden text-slate-100">
          <Outlet />
        </div>
      </main>
    </div>
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

const indexRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/',
  component: ProjectDashboard,
});

const projectLayoutRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'projects/$projectId',
});

const projectListRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/',
  component: lazyRouteComponent(() => import('./ProjectTasksIndex.lazy.tsx')),
});

const taskDetailRoute = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: 'tasks/$taskId',
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
      projectListRoute,
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
